import { BrowserRouter } from "react-router-dom";

/* Routes */
import AppRoutes from "./routes";

/* Context Providers */
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { TrainerProvider } from "./context/TrainerContext";
import { ChatbotProvider } from "./context/ChatbotContext";
import { ThemeProvider } from "./context/ThemeContext";

/* Global styles */
import "./styles/globals.css";
import "./styles/themes.css";
import "./styles/variables.css";

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <TrainerProvider>
              <ChatbotProvider>
                <AppRoutes />
              </ChatbotProvider>
            </TrainerProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
