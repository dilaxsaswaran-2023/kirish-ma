# AgroThulir — Screen inventory

112 screens and prototype states, grouped within the requested five feature areas. All IDs are local prototype identifiers, not Figma node IDs.

## 01 Start

| ID | Screen | Context |
|---|---|---|
| welcome | AgroThulir | A little care. A greener tomorrow. |
| signin | Welcome back | Let’s get your fields ready. |
| home | Good morning | North Field · Today |

## 02 Sites & equipment

| ID | Screen | Context |
|---|---|---|
| sites | My sites | Choose where to work. |
| siteAdd | Add a site | A field, greenhouse or another place. |
| siteAdded | East Field | Your new site is ready. |
| sitesUpdated | My sites | Choose where to work. |
| site | North Field | All systems look good. |
| devices | Controllers | North Field |
| deviceAdd | Add controller | Scan the code on your controller. |
| deviceCode | Controller code | Find it below the QR code. |
| deviceFound | Controller found | Check before adding. |
| controller | Pump controller | North Field · Online · 8 sec ago |
| components | Components | Pump controller · 3 connected |
| componentType | Add component | What are you connecting? |
| motorSetup | Motor setup | Pump controller |
| valveSetup | Valve setup | Pump controller |
| sensorSetup | Sensor setup | Pump controller |
| tankSetup | Tank setup | Add a water source. |
| motorAdded | Motor added | Motor 02 · Output 4 |
| valveAdded | Valve added | Valve C · Output 4 |
| sensorAdded | Sensor added | Flow sensor · Input 1 |
| tankAdded | Tank added | Main tank · 2,000 L |
| motorDetail | Motor 01 | Pump controller · Output 1 |
| valveDetail | Valve A | North beds · Output 2 |
| valveBDetail | Valve B | South beds · Output 3 |
| readings | Readings | Motor 01 · Today |

## 03 Safe controls

| ID | Screen | Context |
|---|---|---|
| protection | Safe watering | These checks protect your equipment. |
| manual | Water now | Motor 01 · North Field |
| duration | Watering time | Motor 01 · North beds |
| manual10 | Water now | Motor 01 · North Field |
| startConfirm10 | Start watering? | North beds · 10 minutes |
| opening10 | Opening valve | Motor stays off until confirmed. |
| running10 | Watering now | North beds · Confirmed live |
| startConfirm | Start watering? | North beds · 20 minutes |
| opening | Opening valve | Motor stays off until confirmed. |
| starting | Starting motor | Valve A is confirmed open. |
| running | Watering now | North beds · Confirmed live |
| stopConfirm | Stop watering? | North beds |
| stopping | Stopping motor | Valve A stays open. |
| closing | Closing valve | Motor 01 is confirmed off. |
| complete | Watering finished | North beds |
| blocked | Motor kept off | The valve has not confirmed open. |
| stopUnknown | Stop not confirmed | The motor may still be running. |
| closeBlocked | Valve stays open | Motor 01 is still running. |
| offline | Controller offline | Tank controller · Last seen 2h ago |
| offlineRetry | Still offline | No reply from the tank controller. |
| valveConfirm | Open Valve A? | Motor 01 will stay off. |
| valveOpening | Opening Valve A | Waiting for position feedback. |
| valveOpen | Valve A is open | Position confirmed · Motor is off |
| valveCloseConfirm | Close Valve A? | Motor 01 is confirmed off. |
| valveClosing | Closing Valve A | Waiting for position feedback. |
| stopConfirm10 | Stop watering? | North beds · 10-minute run |
| stopping10 | Stopping motor | Valve A stays open. |
| closing10 | Closing valve | Motor 01 is confirmed off. |
| complete10 | Watering stopped | North beds · Stopped early |
| completeStopped | Watering stopped | North beds · Stopped early |

## 04 Water path builder

| ID | Screen | Context |
|---|---|---|
| paths | Water paths | Connect equipment. Then set the order. |
| pathEmpty | New water path | 1 · Add your equipment |
| pathPickerMotor | Add to water path | Choose equipment already connected. |
| pathPickBlocked | Valve B needs a check | Resolve its alert before use. |
| pathValveFirst | Valve A added | Add a motor to supply water. |
| pathMotor | Motor added | 1 · Add a valve next |
| pathPickerValve | Choose a valve | Where should the water go? |
| pathNodes | Connect the path | 2 · Tap the motor outlet |
| pathSource | Choose the inlet | 3 · Tap the valve inlet |
| pathConnected | Path connected | Motor 01 → Valve A |
| pathLink | Edit connection | Water direction |
| pathDelete | Remove this link? | Motor 01 → Valve A |
| pathBranchPick | Add a branch | Choose another outlet path. |
| pathBranch | Two water paths | Motor 01 → Valve A / Valve C |
| pathSaved | North beds | Saved water path |
| pathsBranch | Water paths | 2 saved paths |
| pathSavedWait | North beds · 5 sec | Saved · 5-second pressure wait |
| pathsWait | Water paths | 2 saved paths |

## 05 Run order

| ID | Screen | Context |
|---|---|---|
| sequence | Run order | Open valve first. Then start motor. |
| sequenceBranch | Branch run order | Valve A and Valve C together |
| branchSaved | Branch path saved | North & East beds |
| stepPick | Add a step | Choose what happens next. |
| stepWait | Wait step | Pause before starting the motor. |
| sequenceWait | Run order | Wait time updated. |
| stepMotor | Motor action | Motor 01 |
| stepValve | Valve action | Valve A |
| shutdown | Safe stop | This order is protected. |
| reorder | Reorder steps | Tap a step to move it. |
| sequenceInvalid | Check the order | Motor cannot start before the valve. |
| validate | Ready to save | All safety checks passed. |
| validateWait | Ready to save | 5-second wait · All checks passed |

## 06 Scheduling

| ID | Screen | Context |
|---|---|---|
| schedules | Schedules | Water at the right time. |
| scheduleNew | New schedule | 1 · Choose a water path |
| scheduleTiming | Choose a time | 2 · Morning watering |
| scheduleDuration | Run duration | Morning watering |
| scheduleReview | Ready to schedule? | 3 · Check and save |
| scheduleConflict | Time already in use | Motor 01 is booked until 6:20 AM. |
| scheduleTimingAlt | Choose a time | Motor 01 has a morning booking. |
| scheduleResolved | No overlap | New schedule · 6:30 AM |
| scheduleSaved | Schedule saved | Next · Tomorrow, 6:30 AM |
| schedulesUpdated | Schedules | 2 active schedules |
| scheduleDetail | Morning watering | Next · Tomorrow, 6:00 AM |
| scheduleDetailNew | North beds · 6:30 AM | Next · Tomorrow, 6:30 AM |
| schedulePaused | Schedule paused | Morning watering |
| schedulesPaused | Schedules | Morning watering is paused. |
| schedulePausedNew | Schedule paused | North beds · 6:30 AM |
| schedulesNewPaused | Schedules | 1 active · 1 paused |
| scheduleDelete | Delete schedule? | Morning watering · 6:00 AM |
| schedulesEmpty | No schedules yet | Choose when your field gets watered. |

## 07 Alerts

| ID | Screen | Context |
|---|---|---|
| alerts | Field alerts | 1 needs your attention |
| alertDetail | Check Valve B | North Field · 5 minutes ago |
| alertSeen | Alert marked as seen | Valve B still needs a check. |
| alertsSeen | Field alerts | Valve B · Seen, still unresolved |
| stopAlert | Motor stop unconfirmed | Treat the motor as running. |
| history | Past watering | Today · North Field |

