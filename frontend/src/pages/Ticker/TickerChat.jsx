import Chat from "@/components/organisms/ticker/Chat.jsx";

export default function TickerChat({ showChat, onOpen, onClose, context }) {
  return (
    <div className={`chat-sidebar${showChat ? " chat-sidebar--open" : " chat-sidebar--collapsed"}`}>
      {showChat ? (
        <>
          <div className="chat-heading-row">
            <h2 className="chat-heading">AI Chat</h2>
            <button className="chat-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="chat-wrapper">
            <Chat context={context} />
          </div>
        </>
      ) : (
        <button className="chat-open-btn" onClick={onOpen}>
          <span className="chat-open-icon">✦</span> AI Chat
        </button>
      )}
    </div>
  );
}
