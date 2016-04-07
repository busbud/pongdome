BEGIN;

CREATE TABLE history (
    game_id text PRIMARY KEY,
    winner_id text NOT NULL,
    loser_id text NOT NULL,
    winner_points integer[] NOT NULL,
    loser_points integer[] NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE leaderboard (
    user_id text PRIMARY KEY,
    name text NOT NULL,
    match_wins integer NOT NULL,
    match_losses integer NOT NULL,
    game_wins integer NOT NULL,
    game_losses integer NOT NULL,
    points integer NOT NULL,
    avatar text,
    elo integer DEFAULT 1000 NOT NULL,
    streak integer DEFAULT 0 NOT NULL
);

CREATE VIEW leaderboard_display AS
  SELECT *
    FROM leaderboard
   WHERE (
            SELECT created_at
              FROM history
             WHERE winner_id = leaderboard.user_id
                OR loser_id = leaderboard.user_id
          ORDER BY created_at DESC
             LIMIT 1
         ) > now() - interval '2 weeks'
ORDER BY elo DESC;

CREATE TABLE players (
    id text PRIMARY KEY,
    nick text NOT NULL,
    email text,
    avatar text,
    name text,
    website text
);

COMMIT;
