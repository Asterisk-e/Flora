import { FloraApp } from "./core.js";
import { Azalea } from "./apps/azalea.js";
import { Iris } from "./apps/iris.js";
import { Amaryllis } from "./apps/amaryllis.js";
import { Lupine } from "./apps/lupine.js";
import { Anemone } from "./apps/anemone.js";

const flora = new FloraApp();
await flora.init({ azalea: Azalea, iris: Iris, amaryllis: Amaryllis, lupine: Lupine, anemone: Anemone });
