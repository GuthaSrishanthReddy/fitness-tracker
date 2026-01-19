import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import ChatbotFloatingButton from "../components/chatbot/ChatbotFloatingButton";

import "./UserLayout.css";

const UserLayout = () => {
  return (
    <div className="user-layout">
      <Navbar />
      <main className="user-layout__content">
        <Outlet />
      </main>

      {/* Floating AI Chatbot (USER ONLY) */}
      <ChatbotFloatingButton />
    </div>
  );
};

export default UserLayout;
