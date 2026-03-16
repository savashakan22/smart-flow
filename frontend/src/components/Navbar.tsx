import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <button className="navbar__title" onClick={() => handleNavigate("/")}>
          SmartFlow Dashboard
        </button>
      </div>
    </header>
  );
}