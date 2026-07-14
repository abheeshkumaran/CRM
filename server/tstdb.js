const pool = require("./db");

pool.query("SELECT NOW()")
  .then((res) => {
    console.log("✅ PostgreSQL Connected Successfully!");
    console.log(res.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ PostgreSQL Connection Failed");
    console.error(err);
    process.exit(1);
  });