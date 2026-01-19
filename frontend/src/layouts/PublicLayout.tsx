import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";

import "./PublicLayout.css";

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <Navbar />
      <main className="public-layout__content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
