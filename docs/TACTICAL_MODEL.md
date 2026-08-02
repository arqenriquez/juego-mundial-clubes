# Tactical model

The pitch is 105 by 68 metres. Home attacks positive X; away attacks negative X. Each player retains a formation anchor and calculates a desired position from possession, ball progression, role, team direction and limited pressure.

- Defenders advance conservatively and preserve coverage.
- Midfielders connect the ball to the attacking line.
- Forwards make the largest forward run in possession.
- Only the closest two eligible defenders press. Other defenders recover shape instead of chasing the ball.
- Separation force prevents exact overlap.

The active phases are `BUILD_UP`, `PROGRESSION`, `FINAL_THIRD` and a transition placeholder. Pass scoring favours safe forward options with opponent distance and role preference; controlled seed noise prevents identical choices without losing replayability.
