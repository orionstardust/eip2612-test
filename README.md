# EIP2612 test Project

## How to use Hardhat and smart contracts
### Install hardhat, and setup hardhat project
```
npx hardhat
vi hardhat.config.js
```

### Edit main contract
```
vi ./contracts/AlchemicaToken.sol
```

### Compile contract
```
npx hardhat compile
```

### Run deploy script to deploy contract
```
vi ./scripts/deploy.js
npx hardhat run --network local scripts/deploy.js
```

## How to run project
### Install packages
```
yarn install
```

### Configure environment variables
```
vi .env
```

### How to run web project in local
```
yarn start
```
