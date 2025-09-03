import { ThemeToggle } from '@/features/theme/theme-toggle';
import { Wallet } from '@/features/wallet/wallet';
import { Logo } from './logo';
import { Network } from './network';

export function Nav() {
  return (
    <header className="relative grid h-[10vh] min-h-[80px] grid-cols-12">
      <div className="relative -top-[10px] col-start-1 col-end-13 row-[2] ml-[15px] flex items-center justify-start lg:[position:initial] lg:[top:initial] lg:col-end-5 lg:row-[1] xl:ml-[25px] 2xl:col-end-4">
        <Network />
      </div>

      <div className="col-start-1 col-end-10 ml-[15px] flex items-center justify-start sm:col-end-8 lg:col-start-5 lg:col-end-9 xl:mr-[25px] xl:justify-end 2xl:col-start-6 2xl:col-end-10">
        <Wallet />
      </div>

      <div className="col-start-10 col-end-13 flex items-center justify-end p-[0.75em] font-semibold sm:col-start-8 lg:col-start-9 lg:pr-[65px] xl:justify-center xl:bg-sidebar-accent xl:pr-[0] 2xl:col-start-10">
        <Logo />
        <span className="absolute right-[28px] bottom-[18px] sm:right-[15px] lg:bottom-auto xl:right-[30px]">
          <ThemeToggle />
        </span>
      </div>
    </header>
  );
}
