import "./WeightChart.css";

type Props = {
  data?: number[];
};

const WeightChart = ({ data = [] }: Props) => {
  return (
    <div className="weight-chart">
      <h3>Weight</h3>
      <div className="weight-chart__placeholder">
        Chart goes here
      </div>
    </div>
  );
};

export default WeightChart;
