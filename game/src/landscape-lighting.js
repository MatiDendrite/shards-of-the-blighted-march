// Reapply the art-directed sky after time-of-day changes, including regional travel.
export function setLandscapeLighting(rig,atmosphere){
 rig.setTime(atmosphere);
 applyLandscapePalette(rig);
}
export function applyLandscapePalette(rig){
 for(const [key,rgb] of Object.entries({Horizon:[.16,.23,.26],Low:[.13,.20,.24],Mid:[.08,.13,.18],High:[.05,.09,.14],Zenith:[.035,.065,.10],Haze:[.16,.23,.26],Below:[.06,.09,.08],SunGlow:[.2,.24,.25]}))rig.atmos[`uAtm${key}`].value.setRGB(...rgb);
}
// Shared by the game and fixed-camera art checks. Keep one shadow cascade and
// direct rendering on the default profile; material detail is available to all.
export const LANDSCAPE_RENDER_OPTIONS=Object.freeze({
 tier:'phone',hour:16.5,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:36,
 exposure:1.08,sunColor:0xffe8c9,sunIntensity:2.65,fill:1.08,fillChroma:1.2,
 envIntensity:.65,bounce:.48,fogStart:25,fogDensity:.015,
});
