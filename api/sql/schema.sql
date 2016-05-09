BEGIN;

CREATE TABLE players (
    id text PRIMARY KEY,
    name text NOT NULL,
    meta jsonb
);

CREATE TABLE history (
    id text PRIMARY KEY,
    winner_id text NOT NULL REFERENCES players (id),
    loser_id text NOT NULL REFERENCES players (id),
    winner_points integer[] NOT NULL,
    loser_points integer[] NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE leaderboard (
    player_id text PRIMARY KEY REFERENCES players (id),
    wins integer NOT NULL,
    losses integer NOT NULL,
    elo integer DEFAULT 1000 NOT NULL,
    streak integer DEFAULT 0 NOT NULL
);

CREATE VIEW leaderboard_display
  AS SELECT leaderboard.*,
            players.*,
            -- Cast to float in order to remove trailing 0s for display.
            round(leaderboard.wins::numeric / (leaderboard.wins + leaderboard.losses), 2)::float AS ratio
       FROM leaderboard
       JOIN players
         ON players.id = leaderboard.player_id
      WHERE (
               SELECT created_at
                 FROM history
                WHERE winner_id = leaderboard.player_id
                   OR loser_id = leaderboard.player_id
             ORDER BY created_at DESC
                LIMIT 1
            ) > now() - interval '2 weeks'
   ORDER BY elo DESC;

CREATE TABLE state (
    current_match jsonb NOT NULL,
    queue jsonb NOT NULL
);

INSERT INTO state (current_match, queue) VALUES ('null', '[]');

COMMIT;
