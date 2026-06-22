import { createApp } from "vue";
import ElementPlus from "element-plus";
import QrToolPage from "./QrToolPage.vue";
import "element-plus/dist/index.css";
import "../../styles/theme.css";
import "../../styles/layout.css";
import "./styles.css";

createApp(QrToolPage).use(ElementPlus).mount("#app");

