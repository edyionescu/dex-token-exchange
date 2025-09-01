import { clearError, setError } from '@/features/error/error-slice';
import { contractsConfig, toHex } from '@/lib/helpers';
import camelCase from 'lodash/camelCase';
import { useDispatch, useSelector } from 'react-redux';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { resetChainId } from '@/features/wallet/wallet-slice';

import ethereumSepoliaLogo from '@/assets/eth.webp';
import foundryLogo from '@/assets/foundry.webp';
import hardhatLogo from '@/assets/hardhat.svg';

const networkLogos = {
  hardhat: hardhatLogo,
  foundry: foundryLogo,
  ethereumSepolia: ethereumSepoliaLogo,
};

export function Network() {
  const dispatch = useDispatch();
  const { connectedWallet, chainId } = useSelector((state) => state.wallet);

  // 'chainId' is irrelevant in this case, since we're only interested in the 'supportedChains' array
  const { supportedChains } = contractsConfig();
  const isChainSupported = supportedChains.includes(String(chainId));

  async function changeNetwork(chainId) {
    try {
      dispatch(resetChainId());
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      dispatch(clearError({ domain: 'network' }));
    } catch (err) {
      const { message } = err;
      dispatch(setError({ domain: 'network', message }));

      if (import.meta.env.DEV) {
        console.error('Error changing network', err);
      }
    }
  }

  return (
    <Select
      value={isChainSupported ? toHex(chainId) : ''}
      onValueChange={changeNetwork}
      disabled={!connectedWallet.info}
    >
      <SelectTrigger className="w-[190px]">
        <SelectValue
          {...(!isChainSupported && {
            placeholder: 'Select a network',
          })}
          {...(!connectedWallet.info && {
            placeholder: 'Networks',
          })}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {isChainSupported && <SelectLabel>Networks</SelectLabel>}
          {supportedChains.map((contractChainId) => {
            const { name } = contractsConfig(contractChainId).network;
            const logo = networkLogos[camelCase(name)];
            return (
              <SelectItem key={contractChainId} value={toHex(contractChainId)}>
                {logo && (
                  <img
                    src={logo}
                    alt={name}
                    className="w-[16px] grayscale-[100%] filter"
                  />
                )}
                {name}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
