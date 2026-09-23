// Reapply the art-directed sky after time-of-day changes, including regional travel.
export function setLandscapeLighting(rig,atmosphere){
 rig.setTime(atmosphere);
 applyLandscapePalette(rig);
}
export function applyLandscapePalette(rig){
 for(const [key,rgb] of Object.entries({Horizon:[.16,.23,.26],Low:[.13,.20,.24],Mid:[.08,.13,.18],High:[.05,.09,.14],Zenith:[.035,.065,.10],Haze:[.16,.23,.26],Below:[.06,.09,.08],SunGlow:[.2,.24,.25]}))rig.atmos[`uAtm${key}`].value.setRGB(...rgb);
}
