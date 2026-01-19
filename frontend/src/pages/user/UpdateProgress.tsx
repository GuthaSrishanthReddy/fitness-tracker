import "./UpdateProgress.css";

const UpdateProgress = () => {
  return (
    <div className="update-progress">
      <h2>Update Progress</h2>

      <form className="update-progress__form">
        <input type="number" placeholder="Weight (kg)" />
        <input type="number" placeholder="Body Fat (%)" />
        <input type="number" placeholder="Creatine (mg/dL)" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default UpdateProgress;
