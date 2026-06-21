I am building a reusable chart framework in React + TypeScript using lightweight-charts.

I want architecture guidance and implementation suggestions.

Goals:

- Main <Chart /> component should orchestrate everything
- Features should be optional/composable
- Consumers should mostly pass config/props
- Avoid prop drilling and giant switch statements
- Keep good separation internally even if external API is simple

Current stack:

- React
- TypeScript
- lightweight-charts
- hooks-based architecture

I want the following optional child UI/features INSIDE the main chart component:

1. Overlay controls
   Example:

- buttons/toggles for overlays
- HV
- ATR
- compare symbol
- moving averages
- overlays can be dynamically enabled/disabled

2. Chart type controls
   Example:

- Candlestick
- Bar
- Line
- Area
- Histogram

3. Time period controls
   Example:

- 1D
- 1W
- 1M
- 3M
- 1Y

IMPORTANT:

- selected time period state is controlled externally
- Chart component receives:
  - selectedPeriod
  - onPeriodChange

4. Mouse resize functionality
   Need vertical resize support:

- drag up/down
- optional mouse wheel resize
- min/max/default height

5. Plugin/extensibility support
   I want easy future additions:

- indicators
- overlays
- markers
- synced charts
- drawing tools
- custom panes

Questions:

1. Should I use:
   - config/plugin architecture
   - React children composition
   - hybrid approach

2. How should internal state be organized?

3. Should chart creation/update logic be split into:
   - chart lifecycle
   - series updates
   - overlays
   - markers
   - resize
   - controls

4. Best way to expose extensibility?

5. How would you structure:
   - hooks
   - context
   - components
   - plugin API
   - folder structure

6. Should controls be:
   - passed as children
   - built into Chart
   - injected through slots/render props

7. How should I avoid unnecessary chart recreation?

Please provide:

- recommended architecture
- component hierarchy
- hook structure
- example TypeScript interfaces
- example plugin system
- example folder structure
- pros/cons of each approach
- recommendation specifically for lightweight-charts imperative API

8.  I already have something in use Chart Instance ... so thre you can see some funcitoanlites....

but this is not rhat reusable, i want reusablee

create it in separate file called XXXX.tsx

is it better to have as hook or as component ... should hooks be internal then ?
