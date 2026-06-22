import { createApp } from "vue";
import ElementPlus from "element-plus";
import IpLookupPage from "./IpLookupPage.vue";
import "element-plus/dist/index.css";
import "../../styles/theme.css";
import "./styles.css";

createApp(IpLookupPage).use(ElementPlus).mount("#app");
