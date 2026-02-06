import "./ChatInput.css";

export default function ChatInput() {
  return (
    <form className="chat-input" onSubmit={(event) => event.preventDefault()}>
      <input
        className="chat-input__field"
        placeholder="Ask your AI coach..."
      />
      <button className="chat-input__button" type="submit">
        Send
      </button>
    </form>
  );
}
