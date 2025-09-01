import logo from '@/assets/dex.webp';

export function Logo() {
  const title = 'dEx Token Exchange';
  return (
    <>
      <img src={logo} alt={title} className="mr-[1em] w-[35px]" />
      <h1 className="hidden uppercase sm:contents">{title}</h1>
    </>
  );
}
