const GREEN = '#2ebd85';
const RED = '#f6465d';

export const chartColors = {
  GREEN,
  RED,
};

export const options = {
  chart: {
    animations: { enabled: true },
    toolbar: { show: true },
  },
  tooltip: {
    enabled: true,
    theme: 'light',
    style: {
      fontSize: '12px',
    },
    x: {
      show: true,
      format: 'dd MMM yyyy',
    },
    y: {
      show: true,
      title: 'price',
    },
    marker: {
      show: false,
    },
    items: {
      display: 'flex',
    },
    fixed: {
      enabled: false,
      position: 'topRight',
      offsetX: 0,
      offsetY: 0,
    },
  },
  grid: {
    show: true,
    borderColor: '#767F92',
    strokeDashArray: 0,
  },
  plotOptions: {
    candlestick: {
      colors: {
        upward: GREEN,
        downward: RED,
      },
    },
  },
  xaxis: {
    type: 'datetime',
    labels: {
      show: true,
      style: {
        colors: '#767F92',
        fontSize: '14px',
        cssClass: 'apexcharts-xaxis-label',
      },
    },
  },
  yaxis: {
    labels: {
      show: true,
      minWidth: 0,
      maxWidth: 160,
      style: {
        colors: '#767F92',
        fontSize: '14px',
        cssClass: 'apexcharts-yaxis-label',
      },
    },
    tooltip: {
      enabled: true,
    },
  },
};
