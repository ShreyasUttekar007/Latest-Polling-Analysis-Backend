const express = require("express");
const router = express.Router();
const Booth = require("../models/BoothData");
const Intervention = require("../models/InterventionData");
const BoothMapping = require("../models/MappingData");
const Acs = require("../models/AcData");
const { getAllowedScopeByEmail } = require("../utils/accessScope");
const Hierarchy = require("../models/HierarchyMapping");
const { auth } = require("../middleware/auth");

router.use(express.json());

router.put("/update-intervention-action/:id", async (req, res) => {
  const { id } = req.params;
  const { interventionAction } = req.body;

  try {
    // Update the BoothData record by ID
    const updatedData = await Intervention.findByIdAndUpdate(
      id,
      { interventionAction }, // Only update the interventionAction
      { new: true } // Return the updated document
    );

    if (!updatedData) {
      return res.status(404).json({ error: "No record found with this ID" });
    }

    res.json(updatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-ac-names", async (req, res) => {
  try {
    const acs = await BoothMapping.distinct("constituency").sort();
    if (acs.length === 0) {
      return res.status(404).json({ error: "No ACs found" });
    }
    res.json(acs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-zone-names", async (req, res) => {
  try {
    const zones = await BoothMapping.distinct("zone").sort();
    if (zones.length === 0) {
      return res.status(404).json({ error: "No zones found" });
    }
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PC names
router.get("/get-pc-names", auth, async (req, res) => {
  try {
    // ✅ Admin → all PCs
    if (req.user?.isAdmin) {
      const pcs = await Hierarchy.distinct("pc");
      return res.json((pcs || []).filter(Boolean).sort());
    }

    // ✅ Non-admin → scoped by token email
    const email = String(req.user?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "user email missing" });

    const { allowedOr } = await getAllowedScopeByEmail(email);
    if (!allowedOr.length) return res.json([]);

    const pcs = await Hierarchy.distinct("pc", { $or: allowedOr });
    return res.json((pcs || []).filter(Boolean).sort());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


router.get("/get-ac-names-by-pc/:pc", auth, async (req, res) => {
  try {
    const { pc } = req.params;
    if (!pc) return res.status(400).json({ error: "pc is required" });

    // ✅ Admin → all constituencies under that PC
    if (req.user?.isAdmin) {
      const acs = await Hierarchy.distinct("constituency", { pc });
      return res.json((acs || []).filter(Boolean).sort());
    }

    // ✅ Non-admin → scoped
    const email = String(req.user?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "user email missing" });

    const { allowedOr } = await getAllowedScopeByEmail(email);
    if (!allowedOr.length) return res.json([]);

    const acs = await Hierarchy.distinct("constituency", {
      pc,
      $or: allowedOr,
    });

    return res.json((acs || []).filter(Boolean).sort());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



router.get("/get-pc-total", async (req, res) => {
  try {
    const pcs = await BoothMapping.distinct("pc").sort();
    const totalCount = pcs.length;
    if (totalCount === 0) {
      return res.status(404).json({ error: "No PCs found" });
    }
    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-ac-total", async (req, res) => {
  try {
    const acs = await BoothMapping.distinct("constituency").sort();
    const totalCount = acs.length;
    if (totalCount === 0) {
      return res.status(404).json({ error: "No ACs found" });
    }
    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-booth-total", async (req, res) => {
  try {
    const booths = await BoothMapping.distinct("booth").sort();
    const totalCount = booths.length;
    if (totalCount === 0) {
      return res.status(404).json({ error: "No booths found" });
    }
    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/total-votes", async (req, res) => {
  try {
    const result = await Acs.aggregate([
      {
        $group: {
          _id: null,
          totalVotes: { $sum: { $toInt: "$totalVotes" } },
        },
      },
    ]);

    const totalCount = result.length > 0 ? result[0].totalVotes : 0;

    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/total-votes-by-booth-type", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: "$boothType",
          totalVotes: {
            $sum: { $toInt: { $ifNull: ["$totalVotes", "0"] } }, // Ensure numeric
          },
          totalPolledVotes: {
            $sum: { $toInt: { $ifNull: ["$polledVotes", "0"] } }, // Ensure numeric
          },
        },
      },
      {
        $addFields: {
          polledVotesPercentage: {
            $cond: {
              if: { $eq: ["$totalVotes", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$totalPolledVotes", "$totalVotes"] }, 100] },
            },
          },
        },
      },
      {
        $sort: {
          _id: 1, // Sort by boothType
        },
      },
    ]);

    // If no data, return default response
    if (result.length === 0) {
      return res.json([
        { _id: "No Data", totalVotes: 0, totalPolledVotes: 0, polledVotesPercentage: 0 },
      ]);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/get-all-pcs-data", async (req, res) => {
  try {
    // Aggregate to group data by PC and gather unique ACs
    const pcData = await Booth.aggregate([
      {
        $group: {
          _id: "$pc",
          acs: { $addToSet: "$constituency" }
        }
      }
    ]);

    if (!pcData || pcData.length === 0) {
      return res.status(404).json({ error: "No PCs found" });
    }

    // Retrieve data for each PC and its associated ACs
    for (const pc of pcData) {
      // Limit the number of ACs per PC as needed
      pc.acs = pc.acs.slice(0, 6); // Limit to 6 ACs
      // Retrieve data for each AC
      pc.data = [];
      for (const ac of pc.acs) {
        const acData = await Booth.findOne({ pc: pc._id, constituency: ac });
        if (acData) {
          pc.data.push({
            constituency: ac,
            totalVotes: acData.totalVotes,
            polledVotes: acData.polledVotes,
            favVotes: acData.favVotes,
            ubtVotes: acData.ubtVotes
          });
        }
      }
    }

    res.json(pcData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/interventions/counts", auth, async (req, res) => {
  try {
    const { pc, constituency, ward, booth, interventionType, interventionAction } = req.query;

    const matchFilter = {};
    if (pc) matchFilter.pc = pc;
    if (constituency) matchFilter.constituency = constituency;
    if (ward) matchFilter.ward = ward;
    if (booth) matchFilter.booth = booth;
    if (interventionType) matchFilter.interventionType = interventionType;
    if (interventionAction) matchFilter.interventionAction = interventionAction;

    // ✅ Non-admin → scope by token email
    if (!req.user?.isAdmin) {
      const email = String(req.user?.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "user email missing" });

      const { allowedOr } = await getAllowedScopeByEmail(email);

      if (!allowedOr.length) {
        return res.json({
          totalInterventions: 0,
          typeCounts: { Administrative: 0, Political: 0, Police: 0 },
          actionCounts: { Solved: 0, "Not Solved": 0, "Action Taken": 0 },
        });
      }

      matchFilter.$and = matchFilter.$and || [];
      matchFilter.$and.push({ $or: allowedOr });
    }

    // ✅ Admin → no scope restriction

    const counts = await Intervention.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          totalInterventions: [{ $count: "count" }],
          typeCounts: [
            { $match: { interventionType: { $in: ["Administrative", "Political", "Police"] } } },
            { $group: { _id: "$interventionType", count: { $sum: 1 } } },
          ],
          actionCounts: [
            { $match: { interventionAction: { $in: ["Solved", "Not Solved", "Action Taken"] } } },
            { $group: { _id: "$interventionAction", count: { $sum: 1 } } },
          ],
        },
      },
      {
        $project: {
          totalInterventions: { $ifNull: [{ $arrayElemAt: ["$totalInterventions.count", 0] }, 0] },
          typeCounts: {
            $arrayToObject: {
              $map: {
                input: "$typeCounts",
                as: "t",
                in: { k: "$$t._id", v: "$$t.count" },
              },
            },
          },
          actionCounts: {
            $arrayToObject: {
              $map: {
                input: "$actionCounts",
                as: "a",
                in: { k: "$$a._id", v: "$$a.count" },
              },
            },
          },
        },
      },
    ]);

    const result = counts[0] || { totalInterventions: 0, typeCounts: {}, actionCounts: {} };

    ["Administrative", "Political", "Police"].forEach((t) => {
      if (result.typeCounts[t] == null) result.typeCounts[t] = 0;
    });
    ["Solved", "Not Solved", "Action Taken"].forEach((a) => {
      if (result.actionCounts[a] == null) result.actionCounts[a] = 0;
    });

    return res.json(result);
  } catch (error) {
    console.error("Error fetching intervention counts:", error);
    return res.status(500).send("Internal Server Error");
  }
});




router.get("/get-intervention-data-by-constituency/:constituency", async (req, res) => {
  try {
    const { constituency } = req.params;

    // Find all records for the given constituency
    const constituencyData = await Intervention.find({ constituency });

    if (!constituencyData || constituencyData.length === 0) {
      return res.status(404).json({ error: "No data found for this constituency" });
    }

    // Format data for response
    const response = constituencyData.map((record) => ({
      _id: record._id,
      pc: record.pc,
      booth: record.booth,
      constituency: record.constituency,
      interventionType: record.interventionType,
      interventionIssues: record.interventionIssues,
      interventionIssueBrief: record.interventionIssueBrief,
      interventionContactFollowUp: record.interventionContactFollowUp,
      interventionAction: record.interventionAction
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-intervention-data", auth, async (req, res) => {
  try {
    const { pc, constituency, ward, booth, interventionType, interventionAction } = req.query;

    // Base filters (apply to both admin and non-admin)
    const query = {};
    if (pc) query.pc = pc;
    if (constituency) query.constituency = constituency;
    if (ward) query.ward = ward;
    if (booth) query.booth = booth;
    if (interventionType) query.interventionType = interventionType;
    if (interventionAction) query.interventionAction = interventionAction;

    // ✅ ADMIN: return ALL matching records (no scope)
    if (req.user.isAdmin) {
      const interventionData = await Intervention.find(query).sort({ createdAt: -1 });
      return res.json(
        interventionData.map((r) => ({
          _id: r._id,
          pc: r.pc,
          constituency: r.constituency,
          ward: r.ward,
          booth: r.booth,
          interventionType: r.interventionType,
          interventionIssues: r.interventionIssues,
          interventionIssueBrief: r.interventionIssueBrief,
          interventionContactFollowUp: r.interventionContactFollowUp,
          interventionAction: r.interventionAction,
        }))
      );
    }

    // ✅ NON-ADMIN: enforce scope using email from token
    const { allowedOr } = await getAllowedScopeByEmail(req.user.email);

    if (!allowedOr.length) return res.json([]); // better UX than 404 for list

    query.$and = query.$and || [];
    query.$and.push({ $or: allowedOr });

    const interventionData = await Intervention.find(query).sort({ createdAt: -1 });

    return res.json(
      (interventionData || []).map((r) => ({
        _id: r._id,
        pc: r.pc,
        constituency: r.constituency,
        ward: r.ward,
        booth: r.booth,
        interventionType: r.interventionType,
        interventionIssues: r.interventionIssues,
        interventionIssueBrief: r.interventionIssueBrief,
        interventionContactFollowUp: r.interventionContactFollowUp,
        interventionAction: r.interventionAction,
      }))
    );
  } catch (error) {
    console.error("Error fetching intervention data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/get-ward-names", auth, async (req, res) => {
  try {
    const { pc, constituency } = req.query;

    if (!pc || !constituency) {
      return res.status(400).json({ error: "pc and constituency are required" });
    }

    // ✅ Admin → all wards for this pc+constituency
    if (req.user?.isAdmin) {
      const wards = await Hierarchy.distinct("ward", { pc, constituency });
      const sorted = (wards || []).filter(Boolean).sort((a, b) => Number(a) - Number(b));
      return res.json(sorted);
    }

    // ✅ Non-admin → scoped
    const email = String(req.user?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "user email missing" });

    const { allowedOr } = await getAllowedScopeByEmail(email);
    if (!allowedOr.length) return res.json([]);

    const wards = await Hierarchy.distinct("ward", {
      pc,
      constituency,
      $or: allowedOr,
    });

    const sorted = (wards || []).filter(Boolean).sort((a, b) => Number(a) - Number(b));
    return res.json(sorted);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});




router.get("/get-data-by-constituency/:constituency", async (req, res) => {
  try {
    const { constituency } = req.params;

    // Find all records for the given constituency
    const constituencyData = await Booth.find({ constituency });

    if (!constituencyData || constituencyData.length === 0) {
      return res.status(404).json({ error: "No data found for this constituency" });
    }

    // Format data for response
    const response = constituencyData.map((record) => ({
      _id: record._id,
      pc: record.pc,
      constituency: record.constituency,
      boothType: record.boothType,
      totalVotes: record.totalVotes,
      polledVotes: record.polledVotes,  
      favVotes: record.favVotes,
      timeSlot: record.timeSlot,
      otherVotes: record.otherVotes,
      ubtVotes: record.ubtVotes,
      booth: record.booth
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-booth-status/:constituency", async (req, res) => {
  try {
    const { constituency } = req.params;
    const { timeSlot } = req.query; // Optional query parameter for filtering by timeSlot

    // Fetch all booths from AcData for the given constituency
    const acBooths = await Acs.find({ constituency }).select("booth");

    // If no booths are found in AcData, return an empty response
    if (!acBooths || acBooths.length === 0) {
      return res.status(404).json({
        message: `No booths found for the constituency: ${constituency}`,
        totalBooths: 0,
        missingBoothCount: 0,
        boothStatus: [],
      });
    }

    // Extract booth names from AcData
    const acBoothNames = acBooths.map((booth) => booth.booth);

    // Build the query to fetch booths with data in BoothData
    const query = { constituency };
    if (timeSlot) {
      query.timeSlot = timeSlot;
    }

    // Fetch all booths with data in BoothData (filtered by timeSlot if provided)
    const boothDataBooths = await Booth.find(query).select("booth");

    // Extract booth names from BoothData
    const boothDataNames = boothDataBooths.map((booth) => booth.booth);

    // Create booth status list with flags
    const boothStatus = acBoothNames.map((booth) => ({
      boothName: booth,
      status: boothDataNames.includes(booth) ? 1 : 0,
    }));

    // Filter booths with no data (status: 0)
    const noDataBooths = boothStatus.filter((booth) => booth.status === 0);

    // Return response
    res.status(200).json({
      totalBooths: acBoothNames.length,
      missingBoothCount: noDataBooths.length,
      boothStatus,
      noDataBooths: timeSlot ? noDataBooths : undefined, // Only include detailed no-data booths if timeSlot is provided
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/get-booths-by-ac/:constituency", async (req, res) => {
  try {
    const { constituency } = req.params;

    // Find all booths for the given constituency
    const booths = await Acs.find({ constituency });

    // If no booths are found, return a 404 response
    if (!booths || booths.length === 0) {
      return res.status(404).json({
        message: `No booths found for the constituency: ${constituency}`,
        totalBooths: 0,
      });
    }

    // Respond with the booths and their count
    res.status(200).json({
      totalBooths: booths.length,
      booths,
    });
  } catch (error) {
    // Handle any errors
    res.status(500).json({ error: error.message });
  }
});


// Backend: Check if an entry already exists for a booth and time slot
// Assuming you have a Booth model with fields like `booth`, `timeSlot`, and `polledVotes`
router.get('/check-entry', async (req, res) => {
  const { booth, timeSlot, polledVotes } = req.query;

  try {
    const existingEntry = await Booth.findOne({ booth, timeSlot });
    if (existingEntry) {
      return res.json({ exists: true });
    }

    // Check previous entries for the booth
    const previousEntries = await Booth.find({ booth })
      .sort({ timeSlot: -1 }); // Sort by timeSlot descending to get the most recent entry first

    if (previousEntries.length > 0) {
      const latestEntry = previousEntries[0]; // Get the latest entry
      if (latestEntry.timeSlot < timeSlot) {
        if (Number(polledVotes) < latestEntry.polledVotes) {
          return res.json({
            exists: false,
            message: `New polled votes must be greater than or equal to the latest value of ${latestEntry.polledVotes}.`,
          });
        }
      }
    }

    return res.json({ exists: false });

  } catch (error) {
    console.error("Error checking booth entry:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/get-summary-by-constituency/:constituency", async (req, res) => {
  try {
    const { constituency } = req.params;

    // Find all records for the given constituency
    const constituencyData = await Booth.find({ constituency });

    if (!constituencyData || constituencyData.length === 0) {
      return res.status(404).json({ error: "No data found for this constituency" });
    }

    // Create an object to store the latest entry for each booth
    const latestBoothEntries = {};

    constituencyData.forEach((record) => {
      const booth = record.booth;
      const timeSlot = record.timeSlot;

      // Extract hour and minute for comparison without converting to a Date object
      const getTimeValue = (slot) => {
        const [time, period] = slot.split(/(AM|PM)/);
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      // Check if we already have a record for this booth and compare time slots
      if (!latestBoothEntries[booth] || getTimeValue(timeSlot) > getTimeValue(latestBoothEntries[booth].timeSlot)) {
        latestBoothEntries[booth] = record;
      }
    });

    // Aggregate the data based on the latest booth entries
    const summary = Object.values(latestBoothEntries).reduce(
      (acc, record) => {
        acc.totalVotes += parseInt(record.totalVotes, 10) || 0;
        acc.polledVotes += parseInt(record.polledVotes, 10) || 0;
        acc.favVotes += parseInt(record.favVotes, 10) || 0;
        acc.ubtVotes += parseInt(record.ubtVotes, 10) || 0;
        acc.otherVotes += parseInt(record.otherVotes, 10) || 0;
        return acc;
      },
      {
        totalVotes: 0,
        polledVotes: 0,
        favVotes: 0,
        ubtVotes: 0,
        otherVotes: 0,
      }
    );

    // Send the summary response
    res.json({ success: true, constituency, summary });
  } catch (error) {
    console.error("Error fetching constituency summary:", error.message);
    res.status(500).json({ error: error.message });
  }
});



router.get("/get-all-constituencies-data", async (req, res) => {
  try {
    // Aggregate data grouped by constituency and accumulate PCs
    const constituencyData = await Booth.aggregate([
      {
        $addFields: {
          // Convert fields to numbers (if they are strings)
          totalVotes: { $toDouble: "$totalVotes" },
          polledVotes: { $toDouble: "$polledVotes" },
          favVotes: { $toDouble: "$favVotes" },
          ubtVotes: { $toDouble: "$ubtVotes" },
          otherVotes: { $toDouble: "$otherVotes" }
        }
      },
      {
        $group: {
          _id: "$constituency",
          pcs: { $addToSet: "$pc" }, // Gather all unique PCs for each constituency
          totalVotes: { $sum: "$totalVotes" },
          polledVotes: { $sum: "$polledVotes" },
          favVotes: { $sum: "$favVotes" },
          ubtVotes: { $sum: "$ubtVotes" },
          otherVotes: { $sum: "$otherVotes" }
        }
      }
    ]);

    if (!constituencyData || constituencyData.length === 0) {
      return res.status(404).json({ error: "No constituency data found" });
    }

    // Format data for response
    const response = constituencyData.map((record) => ({
      constituency: record._id,
      pcs: record.pcs,
      totalVotes: record.totalVotes,
      polledVotes: record.polledVotes,
      favVotes: record.favVotes,
      ubtVotes: record.ubtVotes,
      otherVotes: record.otherVotes
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/votes-by-fav-ubt-other-percentage", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: "$boothType",
          totalVotes: {
            $sum: {
              $toInt: { 
                $ifNull: [{ $cond: [{ $eq: ["$totalVotes", ""] }, 0, "$totalVotes"] }, 0] 
              }
            }
          },
          totalPolledVotes: {
            $sum: {
              $toInt: {
                $ifNull: [{ $cond: [{ $eq: ["$polledVotes", ""] }, 0, "$polledVotes"] }, 0] 
              }
            }
          },
          totalFavVotes: {
            $sum: {
              $toInt: {
                $ifNull: [{ $cond: [{ $eq: ["$favVotes", ""] }, 0, "$favVotes"] }, 0] 
              }
            }
          },
          totalUbtVotes: {
            $sum: {
              $toInt: {
                $ifNull: [{ $cond: [{ $eq: ["$ubtVotes", ""] }, 0, "$ubtVotes"] }, 0] 
              }
            }
          },
          totalOtherVotes: {
            $sum: {
              $toInt: {
                $ifNull: [{ $cond: [{ $eq: ["$otherVotes", ""] }, 0, "$otherVotes"] }, 0] 
              }
            }
          },
        }
      },
      {
        $addFields: {
          favVotesPercentage: {
            $cond: {
              if: { $eq: ["$totalPolledVotes", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$totalFavVotes", "$totalPolledVotes"] }, 100] }
            }
          },
          ubtVotesPercentage: {
            $cond: {
              if: { $eq: ["$totalPolledVotes", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$totalUbtVotes", "$totalPolledVotes"] }, 100] }
            }
          },
          otherVotesPercentage: {
            $cond: {
              if: { $eq: ["$totalPolledVotes", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$totalOtherVotes", "$totalPolledVotes"] }, 100] }
            }
          },
          polledVotesPercentage: {
            $cond: {
              if: { $eq: ["$totalVotes", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$totalPolledVotes", "$totalVotes"] }, 100] }
            }
          }
        }      
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





router.get("/total-polled-votes", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: null,
          totalPolledVotes: { $sum: { $toInt: "$polledVotes" } },
        },
      },
    ]);

    const totalCount = result.length > 0 ? result[0].totalPolledVotes : 0;

    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/total-fav-votes", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: null,
          totalFavVotes: { $sum: { $toInt: "$favVotes" } },
        },
      },
    ]);

    const totalCount = result.length > 0 ? result[0].totalFavVotes : 0;

    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/total-ubt-votes", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: null,
          totalUbtVotes: { $sum: { $toInt: "$ubtVotes" } },
        },
      },
    ]);

    const totalCount = result.length > 0 ? result[0].totalUbtVotes : 0;

    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/total-other-votes", async (req, res) => {
  try {
    const result = await Booth.aggregate([
      {
        $group: {
          _id: null,
          totalOtherVotes: { $sum: { $toInt: "$otherVotes" } },
        },
      },
    ]);

    const totalCount = result.length > 0 ? result[0].totalOtherVotes : 0;

    res.json({ totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new booth mapping
router.post("/create", async (req, res) => {
  try {
    const booth = new Booth(req.body);
    const savedBooth = await booth.save();
    res.status(201).json(savedBooth);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/create-intervention", async (req, res) => {
  try {
    const booth = new Intervention(req.body);
    const savedBooth = await booth.save();
    res.status(201).json(savedBooth);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Retrieve all booth mappings
router.get("/get-booths", async (req, res) => {
  try {
    const booths = await Booth.find();
    res.json(booths);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve a specific booth mapping by ID
router.get("/:id", async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ error: "Booth not found" });
    }
    res.json(booth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/bybooth/:boothName", async (req, res) => {
  try {
    const boothName = req.params.boothName;
    const boothData = await Booth.find({ booth: boothName });
    if (boothData.length === 0) {
      return res.status(404).json({ error: "Booth data not found" });
    }
    res.json(boothData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/get-booth-names-by-constituency/:constituencyName",
  async (req, res) => {
    try {
      const constituencyName = req.params.constituencyName;
      const booths = await BoothMapping.find(
        { constituency: constituencyName },
        { booth: 1, _id: 0 }
      ).sort({ booth: 1 });
      if (booths.length === 0) {
        return res
          .status(404)
          .json({ error: "No booths found for the constituency" });
      }
      const boothNames = booths.map((booth) => booth.booth);
      res.json(boothNames);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/byConstituency/:constituencyName", async (req, res) => {
  try {
    const constituencyName = req.params.constituencyName;
    // Find booths based on the provided constituency name
    const booths = await Booth.find({ constituency: constituencyName });
    if (booths.length === 0) {
      return res
        .status(404)
        .json({ error: "No booths found for the constituency" });
    }
    res.json(booths);
  } catch (error) {
    console.error("Error getting booths by constituency:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Delete a booth mapping by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const booth = await Booth.findByIdAndDelete(req.params.id);
    if (!booth) {
      return res.status(404).json({ error: "Booth not found" });
    }
    res.json({ message: "Booth deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
