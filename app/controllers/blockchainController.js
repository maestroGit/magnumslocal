// app/controllers/blockchainController.js

// GET /blocks
export function getBlocks(req, res) {
  try {
    res.json(global.bc.chain);
  } catch (error) {
    res.status(500).json({ success: false, error: "Error fetching blocks" });
  }
}
