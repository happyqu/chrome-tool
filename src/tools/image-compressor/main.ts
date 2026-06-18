import { createApp } from "vue";
import ElementPlus from "element-plus";
import ImageCompressorPage from "./ImageCompressorPage.vue";
import "element-plus/dist/index.css";
import "../../styles/theme.css";
import "../../styles/layout.css";
import "./styles.css";

createApp(ImageCompressorPage).use(ElementPlus).mount("#app");
