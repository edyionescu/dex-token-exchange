import { Nav } from '@/components/nav';
import { Toaster } from '@/components/ui/sonner';
import { Order } from '@/features/exchange/order';
import { PriceChart } from '@/features/exchange/price-chart';
import { Transfer } from '@/features/exchange/transfer';
import { Market } from '@/features/token/market';
import { useBlockchainData } from '@/hooks/use-blockchain-data';
import { useEIP6963Providers } from '@/hooks/use-eip6963-providers';
import { useEventListeners } from '@/hooks/use-event-listeners';

import { MyHistory } from './features/exchange/my-history';
import { OpenOrders } from './features/exchange/open-orders';
import { TradeBook } from './features/exchange/trade-book';

function App() {
  useEIP6963Providers(); // Initialize provider detection
  useBlockchainData(); // Fetch blockchain data
  useEventListeners(); // Listen to contract events

  return (
    <div className="mx-auto max-w-[1920px]">
      <Nav />
      <div className="grid min-h-[90vh] grid-cols-12">
        <main className="order-1 col-start-1 col-end-13 grid grid-cols-12 p-[0.13em] xl:order-0 xl:col-end-9 xl:pt-0 2xl:col-end-10">
          <PriceChart />
          <MyHistory />
          <TradeBook />
          <OpenOrders />
        </main>
        <aside className="col-start-1 col-end-13 grid grid-cols-12 bg-sidebar-accent p-[2em] xl:col-start-9 xl:px-[2em] xl:pt-[0.25em] xl:pb-[0] 2xl:col-start-10">
          <Market />
          <Order />
          <Transfer />
        </aside>
      </div>
      <Toaster
        duration={7000}
        richColors
        closeButton
        expand={true}
        position="bottom-center"
      />
    </div>
  );
}

export default App;
