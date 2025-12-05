// Protected Positions Routes (for Protection Dashboard)
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { log } from "../logger";

export function registerProtectedPositionsRoutes(app: Express) {
  // Get all positions with protection set (for Protection Dashboard)
  app.get('/api/protected-positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all households the user can access (using getAllHouseholds which already handles owned + shared)
      const allHouseholds = await storage.getAllHouseholds(userId);
      
      const protectedPositions: Array<{
        positionId: string;
        symbol: string;
        quantity: number;
        entryPrice: number;
        currentPrice: number;
        gainPercent: number;
        marketValue: number;
        protectionPercent: number;
        stopPrice: number | null;
        limitPrice: number | null;
        accountId: string;
        accountType: 'individual' | 'corporate' | 'joint';
        accountLabel: string;
        accountNickname: string | null;
        ownerName: string;
        householdName: string;
        householdCategory: string | null;
        priceUpdatedAt: Date | null;
        status: 'safe' | 'approaching' | 'triggered';
      }> = [];
      
      for (const household of allHouseholds) {
        // Check individual accounts
        const individuals = await storage.getIndividualsByHousehold(household.id);
        for (const individual of individuals) {
          const accounts = await storage.getIndividualAccountsByIndividual(individual.id);
          for (const account of accounts) {
            const positions = await storage.getPositionsByIndividualAccount(account.id);
            for (const pos of positions) {
              if (pos.protectionPercent) {
                const entryPrice = parseFloat(pos.entryPrice || '0');
                const currentPrice = parseFloat(pos.currentPrice || '0');
                const quantity = parseFloat(pos.quantity || '0');
                const stopPrice = pos.stopPrice ? parseFloat(pos.stopPrice) : null;
                const gainPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
                
                // Determine status
                let status: 'safe' | 'approaching' | 'triggered' = 'safe';
                if (stopPrice) {
                  if (currentPrice <= stopPrice) {
                    status = 'triggered';
                  } else if (currentPrice <= stopPrice * 1.05) { // Within 5% of stop
                    status = 'approaching';
                  }
                }
                
                protectedPositions.push({
                  positionId: pos.id,
                  symbol: pos.symbol,
                  quantity,
                  entryPrice,
                  currentPrice,
                  gainPercent,
                  marketValue: quantity * currentPrice,
                  protectionPercent: parseFloat(pos.protectionPercent),
                  stopPrice,
                  limitPrice: pos.limitPrice ? parseFloat(pos.limitPrice) : null,
                  accountId: account.id,
                  accountType: 'individual',
                  accountLabel: account.type.toUpperCase(),
                  accountNickname: account.nickname,
                  ownerName: individual.name,
                  householdName: household.name,
                  householdCategory: household.category,
                  priceUpdatedAt: pos.priceUpdatedAt,
                  status,
                });
              }
            }
          }
        }
        
        // Check corporate accounts
        const corporations = await storage.getCorporationsByHousehold(household.id);
        for (const corp of corporations) {
          const accounts = await storage.getCorporateAccountsByCorporation(corp.id);
          for (const account of accounts) {
            const positions = await storage.getPositionsByCorporateAccount(account.id);
            for (const pos of positions) {
              if (pos.protectionPercent) {
                const entryPrice = parseFloat(pos.entryPrice || '0');
                const currentPrice = parseFloat(pos.currentPrice || '0');
                const quantity = parseFloat(pos.quantity || '0');
                const stopPrice = pos.stopPrice ? parseFloat(pos.stopPrice) : null;
                const gainPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
                
                let status: 'safe' | 'approaching' | 'triggered' = 'safe';
                if (stopPrice) {
                  if (currentPrice <= stopPrice) {
                    status = 'triggered';
                  } else if (currentPrice <= stopPrice * 1.05) {
                    status = 'approaching';
                  }
                }
                
                protectedPositions.push({
                  positionId: pos.id,
                  symbol: pos.symbol,
                  quantity,
                  entryPrice,
                  currentPrice,
                  gainPercent,
                  marketValue: quantity * currentPrice,
                  protectionPercent: parseFloat(pos.protectionPercent),
                  stopPrice,
                  limitPrice: pos.limitPrice ? parseFloat(pos.limitPrice) : null,
                  accountId: account.id,
                  accountType: 'corporate',
                  accountLabel: account.type === 'cash' ? 'Corp Cash' : account.type.toUpperCase(),
                  accountNickname: account.nickname,
                  ownerName: corp.name,
                  householdName: household.name,
                  householdCategory: household.category,
                  priceUpdatedAt: pos.priceUpdatedAt,
                  status,
                });
              }
            }
          }
        }
        
        // Check joint accounts
        const jointAccounts = await storage.getJointAccountsByHousehold(household.id);
        for (const account of jointAccounts) {
          const positions = await storage.getPositionsByJointAccount(account.id);
          const owners = await storage.getJointAccountOwners(account.id);
          const ownerNames = owners.map(o => o.name).join(' & ');
          
          for (const pos of positions) {
            if (pos.protectionPercent) {
              const entryPrice = parseFloat(pos.entryPrice || '0');
              const currentPrice = parseFloat(pos.currentPrice || '0');
              const quantity = parseFloat(pos.quantity || '0');
              const stopPrice = pos.stopPrice ? parseFloat(pos.stopPrice) : null;
              const gainPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
              
              let status: 'safe' | 'approaching' | 'triggered' = 'safe';
              if (stopPrice) {
                if (currentPrice <= stopPrice) {
                  status = 'triggered';
                } else if (currentPrice <= stopPrice * 1.05) {
                  status = 'approaching';
                }
              }
              
              protectedPositions.push({
                positionId: pos.id,
                symbol: pos.symbol,
                quantity,
                entryPrice,
                currentPrice,
                gainPercent,
                marketValue: quantity * currentPrice,
                protectionPercent: parseFloat(pos.protectionPercent),
                stopPrice,
                limitPrice: pos.limitPrice ? parseFloat(pos.limitPrice) : null,
                accountId: account.id,
                accountType: 'joint',
                accountLabel: account.type === 'joint_cash' ? 'Joint Cash' : account.type.toUpperCase(),
                accountNickname: account.nickname,
                ownerName: ownerNames || 'Joint Account',
                householdName: household.name,
                householdCategory: household.category,
                priceUpdatedAt: pos.priceUpdatedAt,
                status,
              });
            }
          }
        }
      }
      
      // Sort by status (triggered first, then approaching, then safe), then by gain %
      protectedPositions.sort((a, b) => {
        const statusOrder = { triggered: 0, approaching: 1, safe: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.gainPercent - a.gainPercent;
      });
      
      res.json(protectedPositions);
    } catch (error: any) {
      log.error("Error fetching protected positions", error);
      res.status(500).json({ message: "Failed to fetch protected positions", error: error.message });
    }
  });
}



