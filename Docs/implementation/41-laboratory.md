# Laboratory facility integration

LABORATORY_CONFIG v1: capacity 1/2/3 scientists by level; available power >=2;
research speed 1/1.1/1.2. Construction, movement, removal, upgrade and dedicated art
reuse the existing laboratory type and APIs. Scientists are exclusive roster jobs:
only actual arrival contributes facility presence. The shared management panel shows
power, scientist count/capacity, facility level, active project and status.

LaboratoryFacility feeds ResearchFacilityProvider. The existing ResearchScheduler
owns the graph, concurrency, payments and unlocks. The strongest operational staffed
facility is selected deterministically; bonuses are never summed across laboratories.
Legacy standalone scheduler callers can omit the optional staffing/modifier fields;
GameSession always supplies authoritative staffing and power from its roster adapter.

Save schema 10 accepts versions 2–9. Assignment positions and research progress are
preserved. Power loss, insufficient staff or loss of a required-level facility shifts
the existing completion deadline by suspended simulation time, without recharging.
A relocated laboratory releases its staff, requiring physical reassignment/arrival.
A replacement valid facility resumes the single existing project. Modifier computation
is derived each cycle, so reload cannot stack a second bonus.

Tests cover unstaffed and en-route rejection without spending, exclusive scientists,
capacity and upgrades, one shared project, suspended completion at outage, demolition,
rebuilding, reload and frame partitioning. Responsive assignment screenshot checks
continue through the shared survivor panel.
