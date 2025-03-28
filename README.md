<h1 align="center">Dobro Wallet</h1>

<p align="center">
  <a href="https://github.com/dobrocity/wallet.dobro.city/releases/latest">
    <img alt="Android" src="https://badgen.net/badge/icon/Android?icon=googleplay&label&color=cyan" />
  </a>
  <a href="https://github.com/dobrocity/wallet.dobro.city/releases/latest">
    <img alt="iOS" src="https://badgen.net/badge/icon/iOS?icon=apple&label&color=cyan" />
  </a>
</p>

<br />

User-friendly Dobro City wallet for the Stellar ecosystem. Featuring multi-signature, custom assets management and more.

Runs on Android and iOS.

## Download

See <https://github.com/dobrocity/wallet.dobro.city/releases>. You will find the binaries there.

## Installation

### Windows

For Windows, we decided to only support 64-bit installations of Windows. If you are running
a 32-bit installation, please let us know by reporting an issue to survey the market demand.

Simply download the latest win-x64.exe file from the [releases](https://github.com/dobrocity/wallet.dobro.city/releases) page and run
the installer. You might need to approve installation of unsigned installer. This will only
be required until we have a signed release available.

### Linux

For Linux, we support the portable AppImage format that works across most Linux distributions, including Ubuntu.

Download the latest linux-x86_64.AppImage from the [releases](https://github.com/dobrocity/wallet.dobro.city/releases) page.

Open a terminal, navigate to the download folder and make the .AppImage an executeable with
the following command:

```
$ chmod a+x Dobro-Wallet.*.AppImage
```

Then you can simply run the program:

```
$ ./Dobro-Wallet.*.AppImage
```

### Mac

Instroduction coming soon.

## Key security

Keys are encrypted with a key derived from the user's password before storing them on the local filesystem. That means that the user's secret key is safe as long as their password is strong enough. However, if they forget their password there will be no way of recovering the secret key. That's why you should always make a backup of your secret key.

The encryption key is derived from the password using `PBKDF2` with `SHA256`. The actual encryption is performed using `xsalsa20-poly1305`.

## Development

Install the dependencies first:

```
npm install
```

### Desktop


To run the app in development mode:

```
npm run dev
```

To run the tests:

```
npm test
```

To run the storybook:

```
npm run storybook
```

### Run dev server without electron

```
npm run dev:web
```

### Android/iOS

#### Android

Initial setup:
```
cd cordova
npm install
npm run install:android
```

Build APK with the app updating on code changes:
```
cd ..
npm run dev:android
```

#### iOS
Initial setup:
```
cd cordova
npm install
npm run install:ios
```

Build APK with the app updating on code changes:
```
cd ..
npm run dev:ios
```


### Production build

#### Web

```
npm run build:web
```

#### Desktop

```
npm run build:mac
npm run build:win
npm run build:linux
```

#### Building windows binaries on macOS

Starting with macOS Catalina 32-bit executables are not supported. This means that the windows binaries cannot be build natively. One can circumvent this issue by using docker for building the windows binaries. Details are documented [here](https://www.electron.build/multi-platform-build#build-electron-app-using-docker-on-a-local-machine). Since is using Squirrel.Windows the `electronuserland/builder:wine-mono` image should be used.

To run the docker container use:

```
docker run --rm -ti \
 --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v ${PWD}:/project \
 -v ${PWD##*/}-node-modules:/project/node_modules \
 -v ~/.cache/electron:/root/.cache/electron \
 -v ~/.cache/electron-builder:/root/.cache/electron-builder \
 -v /Volumes/Certificates/dobro:/root/Certs \
 electronuserland/builder:wine-mono bash -c 'npm config set script-shell bash && npm install && npm run build:win:signed'
```

**Note:** We have seen weird module resolution troubles with Parcel. In this case make sure to `rm -rf node_modules/` **on the host**, then try again.

### Signed binaries

To sign the binaries, make sure you have the code signing certificates on your local filesystem as a `.p12` file and have the password for them. Make sure not to save the certificates in the Dobro directory in order to not accidentally bundling them into the app installer!

You can create a `signing-mac.env` and a `signing-win.env` file, pointing `electron-builder` to the right certificate to use for each target platform:

```
CSC_LINK=~/secret-certificates/SatoshiPayLtd.p12   # point to your local certificate file
```

Now run `npm run build:*:signed` to create a signed application build. You will be prompted for the certificate's password.

To check the Mac DMG signature, run `codesign -dv --verbose=4 ./electron/dist/<file>`. To verify the Windows installer signature, you can upload the file to `virustotal.com`.

Newer versions of Mac OS require apps to be notarized. The `build:mac:signed` script will notarize the app. For this to succeed, you also need to add your Apple ID to your `signing-mac.env` file:

```
APPLE_ID=me@crypto.rocks
```

Note: Application signing has only been tested on a Mac OS development machine so far.

#### Android/iOS

See [Cordova build readme](./cordova/README.md).

## Symbolic links for Windows

The repository uses Linux-compatible symbolic links for the root `shared` folder that has types for TypeScript.

You must first manually delete the existing files that are Linux symbolic links.

For Windows, these files must be removed and the following command can be used:

```sh
cd electron\src
mklink /D shared ..\..\shared

cd src
mklink /D shared ..\shared
```

This will fix the `IPC` module errors.

## License

MIT
