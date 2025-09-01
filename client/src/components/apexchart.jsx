import Chart from 'react-apexcharts';

export function ApexChart({ type, options, series, height }) {
  return (
    <Chart type={type} options={options} series={series} height={height} />
  );
}
