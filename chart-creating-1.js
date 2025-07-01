  document.addEventListener("DOMContentLoaded", () => {
    Chart.register(ChartDataLabels);

    document.querySelectorAll('[data-chart]').forEach((div, index) => {
      try {
        const rawAttr = div.getAttribute('data-chart');
        const decodedAttr = rawAttr.replace(/&quot;/g, '"')
                                   .replace(/&#39;/g, "'")
                                   .replace(/&amp;/g, "&");
        const config = JSON.parse(decodedAttr);
        const chartType = config.type === "horizontalBar" ? "bar" : config.type;

        const options = config.options || {};
        if (config.type === "horizontalBar") {
          options.indexAxis = 'y';
        }

        // Tooltip + label formatter logic
        let tooltipCallback = (tooltipItem) => tooltipItem.raw;
        let datalabelFormatter = (value) => `${value}`;

        if (options.tooltipFormat === "percent") {
          tooltipCallback = (tooltipItem) => {
            const label = tooltipItem.dataset.label || '';
            return `${label}: ${tooltipItem.raw}%`;
          };
          datalabelFormatter = (value) => `${value}%`;
        } else if (options.tooltipFormat === "currency") {
          tooltipCallback = (tooltipItem) => {
            const label = tooltipItem.dataset.label || '';
            return `${label}: $${Number(tooltipItem.raw).toLocaleString()}`;
          };
          datalabelFormatter = (value) => `$${Number(value).toLocaleString()}`;
        }

        // Apply plugins
        options.plugins = {
          ...options.plugins,
          tooltip: {
            callbacks: {
              label: tooltipCallback
            }
          },
          datalabels: {
            anchor: 'end',
            align: 'end',
            clamp: true,     // keep labels within chart area
            clip: false,     // let them overflow safely
            formatter: datalabelFormatter,
            color: '#000',
            font: {
              weight: 'bold'
            }
          }
        };

        const canvas = document.createElement('canvas');
        canvas.id = `chart-${index}`;
        div.appendChild(canvas);

        new Chart(canvas, {
          type: chartType,
          data: {
            labels: config.labels,
            datasets: config.datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 30,
                bottom: 30,
                left: 40,
                right: 40
              }
            },
            elements: {
              bar: {
                borderSkipped: false,
                clip: false
              }
            },
            scales: options.scales || {},
            plugins: {
              legend: {
                display: options.legend?.display ?? true,
                position: options.legend?.position || 'top'
              },
              ...options.plugins
            },
            ...options
          }
        });

      } catch (e) {
        console.error("Invalid chart data-chart value:", e);
      }
    });
  });

  
