import BigNumber from "big.js"
import { nanoid } from "nanoid"
import React from "react"
import { useTranslation } from "react-i18next"
import { Asset } from "@stellar/stellar-sdk"
import Typography from "@material-ui/core/Typography"
import { AssetTransferInfo } from "@suncewallet/stellar-transfer"
import { trackError } from "~App/contexts/notifications"
import theme from "~App/theme"
import { ActionButton, DialogActionsBox } from "~Generic/components/DialogActions"
import { ReadOnlyTextfield } from "~Generic/components/FormFields"
import Portal from "~Generic/components/Portal"
import { useStellarToml } from "~Generic/hooks/stellar"
import { useLiveAccountData } from "~Generic/hooks/stellar-subscriptions"
import { RefStateObject } from "~Generic/hooks/userinterface"
import { useLoadingState } from "~Generic/hooks/util"
import { CustomError } from "~Generic/lib/errors"
import { findMatchingBalanceLine } from "~Generic/lib/stellar"
import { VerticalLayout } from "~Layout/components/Box"
import { formatDescriptionText } from "../util/formatters"
import { TransferStates } from "../util/statemachine"
import { DepositContext } from "./DepositProvider"
import { FormBuilder, FormBuilderField } from "./FormBuilder"
import FormLayout from "./FormLayout"
import { Paragraph, Summary } from "./Sidebar"
import { WithdrawalContext } from "./WithdrawalProvider"

type FormValues = Record<string, string>

type FormValueTransform<Value = string> = (input: Value) => Value

const isFormValueSet = (value: string | undefined): boolean => typeof value === "string" && value.length > 0

function filterObject<V>(obj: { [key: string]: V }, filter: (value: V, key: string) => boolean) {
  return Object.keys(obj).reduce<{ [key: string]: V }>((filtered, key) => {
    const value = obj[key]
    return filter(value, key) ? { ...filtered, [key]: value } : filtered
  }, {})
}

function maybeIBAN(value: string) {
  if (value && value.length >= 15 && value.match(/^[A-Z]{2}[0-9]{2}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}/)) {
    return value.replace(/\s+/g, "")
  }
  return value
}

function postprocessFormValue(originalValue: string, transforms: FormValueTransform[]) {
  return transforms.reduce((transformed, transform) => transform(transformed), originalValue)
}

function postprocessFormValues(inputFormValues: FormValues, methodID: string): FormValues {
  const formValues = { ...inputFormValues }

  if (methodID === "bank_account") {
    formValues.dest = postprocessFormValue(formValues.dest, [maybeIBAN])
  }
  return formValues
}

interface ReadOnlyFieldProps {
  asset: Asset
  metadata: AssetTransferInfo["deposit"] | AssetTransferInfo["withdraw"]
}

const MinMaxAmount = React.memo(function MinMaxAmount(props: ReadOnlyFieldProps) {
  const { t } = useTranslation()

  const assetCode = props.asset ? props.asset.getCode() : ""
  if (!props.metadata || (!props.metadata.min_amount && !props.metadata.max_amount)) {
    return null
  }
  return (
    <ReadOnlyTextfield
      inputProps={{
        style: {
          color: theme.palette.text.secondary
        }
      }}
      label={t("transfer-service.transfer-details.body.min-max-amount.label")}
      style={{ marginTop: 24 }}
      value={[
        props.metadata.min_amount
          ? t(
              "transfer-service.transfer-details.body.min-max-amount.min-amount",
              `Min. ${props.metadata.min_amount} ${assetCode}`.trim(),
              { amount: props.metadata.min_amount, assetCode }
            )
          : null,
        props.metadata.max_amount
          ? t(
              "transfer-service.transfer-details.body.min-max-amount.max-amount",
              `Max. ${props.metadata.max_amount} ${assetCode}`.trim(),
              { amount: props.metadata.max_amount, assetCode }
            )
          : null
      ]
        .filter(str => Boolean(str))
        .join(" / ")}
    />
  )
})

const filterEmptyStrings = (array: string[]): string[] => array.filter(str => str !== "")

interface TransferFeeProps extends ReadOnlyFieldProps {
  domain: string
  type: "deposit" | "withdrawal"
}

const TransferFee = React.memo(function TransferFee(props: TransferFeeProps) {
  const { t } = useTranslation()

  if (!props.metadata) {
    return null
  }

  const formattedFee =
    filterEmptyStrings([
      typeof props.metadata.fee_fixed === "number"
        ? `${props.metadata.fee_fixed} ${props.asset && props.asset.getCode()}`
        : "",
      typeof props.metadata.fee_percent === "number" ? `${props.metadata.fee_percent}%` : ""
    ]).join(" + ") || "unknown"

  return (
    <ReadOnlyTextfield
      helperText={t("transfer-service.transfer-details.body.fee.helper-text", `As charged by ${props.domain}`, {
        domain: props.domain
      })}
      inputProps={{
        style: {
          color: theme.palette.text.secondary
        }
      }}
      label={
        props.type === "deposit"
          ? t("transfer-service.transfer-details.body.fee.label.deposit")
          : t("transfer-service.transfer-details.body.fee.label.withdrawal")
      }
      style={{ marginTop: 24 }}
      value={
        props.metadata.fee_fixed === 0 && props.metadata.fee_percent === 0
          ? `${props.metadata.fee_fixed} ${props.asset && props.asset.getCode()}`
          : formattedFee
      }
    />
  )
})

interface TransferDetailsFormProps {
  active: boolean
  assetTransferInfos: AssetTransferInfo[]
  dialogActionsRef: RefStateObject | undefined
  state: TransferStates.EnterBasics
  type: "deposit" | "withdrawal"
}

function TransferDetailsForm(props: TransferDetailsFormProps) {
  const { account, actions } =
    // eslint-disable-next-line react-hooks/rules-of-hooks
    props.type === "deposit" ? React.useContext(DepositContext) : React.useContext(WithdrawalContext)

  const accountData = useLiveAccountData(account.publicKey, account.testnet)
  const balanceLine = findMatchingBalanceLine(accountData.balances, props.state.asset)
  const balance = balanceLine ? BigNumber(balanceLine.balance) : BigNumber(0)

  const formID = React.useMemo(() => nanoid(), [])
  const [submissionState, handleSubmission] = useLoadingState({ throwOnError: true })
  const { t } = useTranslation()

  const assetInfo = props.assetTransferInfos.find(info => info.asset.equals(props.state.asset))
  const stellarToml = useStellarToml(props.state.transferServer.domain)

  const [formValues, setFormValues] = React.useState<FormValues>(
    (props.state.formValues as Record<string, string>) || {}
  )
  const setFormValue = (fieldName: string, newValue: string) =>
    setFormValues(prevFormValues => ({ ...prevFormValues, [fieldName]: newValue }))

  const handleSubmit = React.useCallback(
    (event: React.SyntheticEvent) => {
      event.preventDefault()

      handleSubmission(
        actions
          .submitTransferFieldValues({
            ...props.state,
            formValues: {
              ...props.state.formValues,
              ...postprocessFormValues(formValues, props.state.method),
              account: account.accountID
            }
          })
          .catch(error => {
            if (error.message?.includes("Cannot fetch web auth challenge")) {
              trackError(CustomError("FetchWebAuthChallengeError", "Cannot fetch web auth challenge"))
            } else {
              trackError(error)
            }
          })
      )
    },
    [account.accountID, actions, formValues, handleSubmission, props.state]
  )

  const methodMetadata = (() => {
    if (props.type === "deposit") {
      return assetInfo && assetInfo.deposit ? assetInfo.deposit : null
    } else {
      return assetInfo && assetInfo.withdraw && assetInfo.withdraw.types
        ? assetInfo.withdraw.types[props.state.method]
        : null
    }
  })()

  const isSEP24Anchor = Boolean(stellarToml && stellarToml.TRANSFER_SERVER_SEP0024)
  const fields = methodMetadata && methodMetadata.fields && !isSEP24Anchor ? methodMetadata.fields : {}

  const automaticallySetValues = ["account", "asset_code", "type"]
  const emailField = fields.email || fields.email_address

  // The .filter() is necessary due to a misplaced prop in the response of an anchor
  const hasEmptyMandatoryFields = Object.keys(fields)
    .filter(key => fields[key] && typeof fields[key] === "object")
    .some(key => !fields[key].optional && !formValues[key] && automaticallySetValues.indexOf(key) === -1)

  const amountOptional = fields.amount ? fields.amount.optional : true
  const emailOptional = emailField ? emailField.optional : true

  const validAmount =
    (amountOptional || isFormValueSet(formValues.amount)) && /^([0-9]+(\.[0-9]+)?)?$/.test(formValues.amount || "")

  const validBalance =
    props.type === "deposit" ||
    !assetInfo ||
    !assetInfo.withdraw?.min_amount ||
    BigNumber(assetInfo.withdraw.min_amount).lte(balance)

  const validEmail =
    (emailOptional === true || isFormValueSet(formValues.email) || isFormValueSet(formValues.email_address)) &&
    /^([^@]+@[^@]+\.[^@]+)?$/.test(formValues.email || formValues.email_address || "")

  const isDisabled = hasEmptyMandatoryFields || !validAmount || !validEmail || !validBalance

  return (
    <form id={formID} noValidate onSubmit={handleSubmit}>
      <VerticalLayout>
        <FormLayout>
          {fields.dest ? (
            <FormBuilderField
              name={t("transfer-service.transfer-details.body.destination.name")}
              descriptor={fields.dest || {}}
              onChange={event => setFormValue("dest", event.target.value)}
              style={{ marginTop: 24 }}
              value={formValues.dest || ""}
            />
          ) : null}
          {fields.dest_extra ? (
            <FormBuilderField
              name={
                fields.dest_extra.description
                  ? formatDescriptionText(fields.dest_extra.description)
                  : t("transfer-service.transfer-details.body.dest_extra.name")
              }
              descriptor={fields.dest_extra}
              onChange={event => setFormValue("dest_extra", event.target.value)}
              style={{ marginTop: 24 }}
              value={formValues.dest_extra || ""}
            />
          ) : null}
        </FormLayout>
        <FormBuilder
          fields={filterObject(
            fields,
            (value, key) => [...automaticallySetValues, "amount", "dest", "dest_extra"].indexOf(key) === -1
          )}
          fieldStyle={{ marginTop: 24 }}
          formValues={formValues}
          onSetFormValue={setFormValue}
        />
        <FormLayout>
          <MinMaxAmount asset={props.state.asset} metadata={assetInfo && assetInfo.withdraw} />
          {!validBalance && (
            <Typography color="error" variant="caption">
              {t("transfer-service.transfer-details.body.min-max-amount.not-enough-funds")}
            </Typography>
          )}
          <TransferFee
            asset={props.state.asset}
            domain={assetInfo ? assetInfo.transferServer.domain : ""}
            metadata={assetInfo && (props.type === "deposit" ? assetInfo.deposit : assetInfo.withdraw)}
            type={props.type}
          />
        </FormLayout>
        <Portal desktop="inline" target={props.dialogActionsRef && props.dialogActionsRef.element}>
          <DialogActionsBox>
            <ActionButton
              disabled={isDisabled}
              form={formID}
              loading={submissionState && submissionState.type === "pending"}
              onClick={() => undefined}
              type="submit"
            >
              {t("transfer-service.transfer-details.action.proceed")}
            </ActionButton>
          </DialogActionsBox>
        </Portal>
      </VerticalLayout>
    </form>
  )
}

const Sidebar = (props: { type: "deposit" | "withdrawal" }) => {
  const { t } = useTranslation()
  return props.type === "deposit" ? (
    <Summary headline={t("transfer-service.transfer-details.sidebar.deposit.headline")}>
      <Paragraph>{t("transfer-service.transfer-details.sidebar.deposit.info.1")}</Paragraph>
      <Paragraph>{t("transfer-service.transfer-details.sidebar.deposit.info.2")}</Paragraph>
    </Summary>
  ) : (
    <Summary headline={t("transfer-service.transfer-details.sidebar.withdrawal.headline")}>
      <Paragraph>{t("transfer-service.transfer-details.sidebar.withdrawal.info.1")}</Paragraph>
      <Paragraph>{t("transfer-service.transfer-details.sidebar.withdrawal.info.2")}</Paragraph>
    </Summary>
  )
}

const DetailsFormView = Object.assign(React.memo(TransferDetailsForm), { Sidebar })

export default DetailsFormView
