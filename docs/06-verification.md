# 6. Verification and delivery

## Different checks answer different questions

Verification grew with the game. Logic tests check combat and progression rules; browser tests exercise input and interface behaviour; visual checks inspect the rendered scene. A screenshot alone cannot prove that a campaign is completable, and a passing model test cannot prove that a character is visible or a touch button is usable.

The [automated tools](../tools/) keep these roles separate. This chapter describes how to repeat the checks, not a permanent certificate that every future revision or hosting environment will pass them.

## Fast model and regression checks

After installing the dependencies as described in the [README](../README.md#run-locally), run:

```sh
npm run test:unit
```

The suite covers combat timing, stamina, skills, rewards, save validation, campaign progression, services, geography, terrain, camera behaviour and presentation-related geometry. Important regressions include duplicated quest rewards, inaccessible old drops, attacks passing through obstacles and movement changing incorrectly while the camera turns.

Targeted suites are available through package scripts such as `test:combat`, `test:campaign` and `test:rpg`. These checks do not require the development server.

## Browser and input checks

Start the server with `npm start` in a separate terminal, then run:

```sh
npm test
```

This combines the unit suite with a browser smoke test. The smoke test starts the game, exercises desktop and touch movement, checks pause behaviour and records browser errors. It does not play the entire campaign.

More focused scripts cover the inventory, atlas, services, classes and camera. The `test:journey` script drives a longer campaign through real input. Browser checks use Puppeteer and require its browser installation and the relevant operating-system libraries; software-rendered runs can take considerably longer than ordinary play.

The `test:journey:ci` variant preserves the input and simulation checks but skips repeated world rendering after the initial frame. It is useful for integration testing, not evidence of visual quality or hardware frame rate. Rendering and performance must be checked separately.

## Visual and rendering checks

Model reviews inspect silhouettes, attachment points, grounding and routes through the scene. Rendering checks examine draw calls, triangle counts, texture uploads, loading behaviour and repeated work when the interface is idle. Measurements depend on the scene, device and execution mode; headless software rendering is not a substitute for testing an actual phone or laptop.

The README screenshots come from [the capture script](../tools/readme-screenshots.mjs). It uses disposable saves and location fixtures to reach representative scenery while retaining the game's normal models, lighting and HUD. Those images are illustrations of the running game, not evidence of an earned playthrough.

## Preparing the playable folder

The game has no build step or application backend. Its self-contained [game/](../game/) folder includes the runtime code, images, vendor libraries and redistribution notices. The repository also retains source experiments and development tools, which are not needed in the hosted playable folder.

With Node.js 22 available, the bundled folder check is:

```sh
node tools/404/ship.mjs game
```

It checks module parsing and paths within the playable folder. It is not the live-site jam gate. After hosting the game, verify the actual public address with the current official jam tooling and match the submitted revision to that build. Local development results do not establish the loading behaviour or correctness of a later deployment.

## Automatic GitHub Pages deployment

The [Pages workflow](../.github/workflows/pages.yml) runs after each push to `main`, or manually from the repository's Actions tab with `main` selected. It installs the locked test dependencies using Node.js 22, runs the unit suite and checks the standalone folder. Only after these checks pass does it publish the contents of `game/` as the site root. Documentation, development tools and local test artifacts are not included in the website.

Before the first deployment, select **Settings → Pages → Build and deployment → Source → GitHub Actions** in the repository. Push the workflow to `main` after enabling this setting, or run it manually if it was already pushed. No personal access token or additional repository secret is needed; deployment uses GitHub's built-in credentials with Pages-specific permissions. See the [GitHub Pages setup instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).

The published URL appears in the workflow's `github-pages` deployment environment. For an ordinary project repository without a custom domain, it has the form `https://<owner>.github.io/<repository>/`; there is no additional `/game/` suffix. The owner controls publication by pushing to `main`. Experimental branches are not deployed. Browser playtests and the live-site jam gate remain separate checks, not guarantees provided by this workflow.

[Back to development stages](README.md)
