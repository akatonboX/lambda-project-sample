import { Client1CommonCustomizer } from "./client1/client1CommonCustomizer";
import { CustomizerManager } from "./common";

export const customizerManager = new CustomizerManager([
  new Client1CommonCustomizer(),
])