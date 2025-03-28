import React from "react"
import ListItem from "@material-ui/core/ListItem"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import makeStyles from "@material-ui/core/styles/makeStyles"
import ListItemText from "@material-ui/core/ListItemText"
import { useIsMobile } from "~Generic/hooks/userinterface"
import { breakpoints } from "~App/theme"

const isMobileDevice = import.meta.env.VITE_PLATFORM === "android" || import.meta.env.VITE_PLATFORM === "ios"

const useAppSettingsItemStyles = makeStyles({
  caret: {
    color: "rgba(0, 0, 0, 0.35)",
    fontSize: 48,
    justifyContent: "center",
    marginRight: -8,
    width: 48
  },
  icon: {
    fontSize: 28,
    justifyContent: "center",
    marginRight: 4,
    width: 28
  },
  settingsItem: {
    position: "relative",
    padding: "16px 24px",
    background: "#FFFFFF",

    [breakpoints.down(600)]: {
      padding: "16px 12px"
    },

    "&:focus": {
      backgroundColor: "#FFFFFF"
    },
    "&$actionable:hover": {
      backgroundColor: isMobileDevice ? "#FFFFFF" : "rgb(232, 232, 232)"
    },
    "&:not(:first-child)": {
      borderTop: "1px solid rgba(230, 230, 230, 1.0)"
    }
  },
  actionable: {}
})

interface AppSettingsItemProps {
  actions?: React.ReactNode
  disabled?: boolean
  icon: React.ReactElement
  primaryText: string
  secondaryText?: string
  style?: React.CSSProperties
  onClick?: () => void
}

function AppSettingsItem(props: AppSettingsItemProps) {
  const classes = useAppSettingsItemStyles()
  const isSmallScreen = useIsMobile()

  const { actions, primaryText, secondaryText, style } = props

  const listItemTextStyle: React.CSSProperties = React.useMemo(
    () => ({
      paddingRight: isSmallScreen ? 0 : undefined
    }),
    [isSmallScreen]
  )

  const className = `${classes.settingsItem} ${props.onClick ? classes.actionable : ""}`

  return (
    <ListItem
      button={Boolean(props.onClick) as any}
      className={className}
      disabled={props.disabled}
      onClick={props.onClick}
      style={style}
    >
      <ListItemIcon className={classes.icon}>{props.icon}</ListItemIcon>
      <ListItemText primary={primaryText} secondary={secondaryText} style={listItemTextStyle} />
      {actions}
    </ListItem>
  )
}

export default AppSettingsItem
