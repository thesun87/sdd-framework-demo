// Entry point tối thiểu cho T001 — chỉ để `vite build` có thứ thật để build.
// KHÔNG chứa logic sản phẩm. Task sở hữu UI sẽ thay nội dung này.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<StrictMode />);
}
