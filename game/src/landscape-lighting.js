// A clear afternoon sky: bright haze keeps distance readable instead of murky.
// Reapply the art-directed sky after time-of-day changes, including regional travel.
export function setLandscapeLighting(rig,atmosphere){
 rig.setTime(atmosphere);
 applyLandscapePalette(rig);
}
export function applyLandscapePalette(rig){
 for(const [key,rgb] of Object.entries({Horizon:[.44,.56,.66],Low:[.36,.50,.64],Mid:[.25,.40,.60],High:[.17,.31,.54],Zenith:[.11,.23,.46],Haze:[.46,.57,.66],Below:[.16,.20,.15],SunGlow:[.66,.58,.44]}))rig.atmos[`uAtm${key}`].value.setRGB(...rgb);
}
// Shared by the game and fixed-camera art checks. Keep one shadow cascade and
// direct rendering on the default profile; material detail is available to all.
export const LANDSCAPE_RENDER_OPTIONS=Object.freeze({
 tier:'phone',hour:16.5,azimuth:245,post:false,cascades:1,shadowMap:1024,shadowDist:36,
 exposure:1.1,sunColor:0xfff0d6,sunIntensity:2.9,fill:1.18,fillChroma:1.25,
 envIntensity:.72,bounce:.52,fogStart:32,fogDensity:.009,
});
