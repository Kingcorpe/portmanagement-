// Recovery Positions Routes (for Recovery Dashboard - positions with losses)
import type { Express } from "express";
import { isAuthenticated } from "../clerkAuth";
import { storage } from "../storage";
import { log } from "../logger";

export function registerRecoveryPositionsRoutes(app: Express) {
  // Get all positions that are underwater (negative gains)
  app.get('/api/recovery-positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all households the user can access
      const allHouseholds = await storage.getAllHouseholds(userId);
      
      const recoveryPositions: Array<{
        positionId: string;
        symbol: string;
        quantity: number;
        entryPrice: number;
        currentPrice: number;
        lossPercent: number;
        lossAmount: number;
        marketValue: number;
        costBasis: number;
        accountId: string;
        accountType: 'individual' | 'corporate' | 'joint';
        accountLabel: string;
        accountNickname: string | null;
        ownerName: string;
        householdName: string;
        householdCategory: string | null;
        priceUpdatedAt: Date | null;
        severity: 'minor' | 'moderate' | 'severe';
      }> = [];
      
      for (const household of allHouseholds) {
        // Check individual accounts
        const individuals = await storage.getIndividualsByHousehold(household.id);
        for (const individual of individuals) {
          const accounts = await storage.getIndividualAccountsByIndividual(individual.id);
          for (const account of accounts) {
            const positions = await storage.getPositionsByIndividualAccount(account.id);
            for (const pos of positions) {
              // Skip CASH positions
              if (pos.symbol === 'CASH') continue;
              
              const entryPrice = parseFloat(pos.entryPrice || '0');
              const currentPrice = parseFloat(pos.currentPrice || '0');
              const quantity = parseFloat(pos.quantity || '0');
              
              // Only include positions with losses (currentPrice < entryPrice)
              if (entryPrice <= 0 || currentPrice >= entryPrice) continue;
              
              const lossPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
              const costBasis = quantity * entryPrice;
              const marketValue = quantity * currentPrice;
              const lossAmount = costBasis - marketValue;
              
              // Determine severity
              let severity: 'minor' | 'moderate' | 'severe' = 'minor';
              if (lossPercent <= -20) {
                severity = 'severe';
              } else if (lossPercent <= -10) {
                severity = 'moderate';
              }
              
              recoveryPositions.push({
                positionId: pos.id,
                symbol: pos.symbol,
                quantity,
                entryPrice,
                currentPrice,
                lossPercent,
                lossAmount,
                marketValue,
                costBasis,
                accountId: account.id,
                accountType: 'individual',
                accountLabel: account.type.toUpperCase(),
                accountNickname: account.nickname,
                ownerName: individual.name,
                householdName: household.name,
                householdCategory: household.category,
                priceUpdatedAt: pos.priceUpdatedAt,
                severity,
              });
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
              if (pos.symbol === 'CASH') continue;
              
              const entryPrice = parseFloat(pos.entryPrice || '0');
              const currentPrice = parseFloat(pos.currentPrice || '0');
              const quantity = parseFloat(pos.quantity || '0');
              
              if (entryPrice <= 0 || currentPrice >= entryPrice) continue;
              
              const lossPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
              const costBasis = quantity * entryPrice;
              const marketValue = quantity * currentPrice;
              const lossAmount = costBasis - marketValue;
              
              let severity: 'minor' | 'moderate' | 'severe' = 'minor';
              if (lossPercent <= -20) {
                severity = 'severe';
              } else if (lossPercent <= -10) {
                severity = 'moderate';
              }
              
              recoveryPositions.push({
                positionId: pos.id,
                symbol: pos.symbol,
                quantity,
                entryPrice,
                currentPrice,
                lossPercent,
                lossAmount,
                marketValue,
                costBasis,
                accountId: account.id,
                accountType: 'corporate',
                accountLabel: account.type === 'cash' ? 'Corp Cash' : account.type.toUpperCase(),
                accountNickname: account.nickname,
                ownerName: corp.name,
                householdName: household.name,
                householdCategory: household.category,
                priceUpdatedAt: pos.priceUpdatedAt,
                severity,
              });
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
            if (pos.symbol === 'CASH') continue;
            
            const entryPrice = parseFloat(pos.entryPrice || '0');
            const currentPrice = parseFloat(pos.currentPrice || '0');
            const quantity = parseFloat(pos.quantity || '0');
            
            if (entryPrice <= 0 || currentPrice >= entryPrice) continue;
            
            const lossPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            const costBasis = quantity * entryPrice;
            const marketValue = quantity * currentPrice;
            const lossAmount = costBasis - marketValue;
            
            let severity: 'minor' | 'moderate' | 'severe' = 'minor';
            if (lossPercent <= -20) {
              severity = 'severe';
            } else if (lossPercent <= -10) {
              severity = 'moderate';
            }
            
            recoveryPositions.push({
              positionId: pos.id,
              symbol: pos.symbol,
              quantity,
              entryPrice,
              currentPrice,
              lossPercent,
              lossAmount,
              marketValue,
              costBasis,
              accountId: account.id,
              accountType: 'joint',
              accountLabel: account.type === 'joint_cash' ? 'Joint Cash' : account.type.toUpperCase(),
              accountNickname: account.nickname,
              ownerName: ownerNames || 'Joint Account',
              householdName: household.name,
              householdCategory: household.category,
              priceUpdatedAt: pos.priceUpdatedAt,
              severity,
            });
          }
        }
      }
      
      // Sort by severity (severe first), then by loss percent (most negative first)
      recoveryPositions.sort((a, b) => {
        const severityOrder = { severe: 0, moderate: 1, minor: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.lossPercent - b.lossPercent; // More negative first
      });
      
      res.json(recoveryPositions);
    } catch (error: any) {
      log.error("Error fetching recovery positions", error);
      res.status(500).json({ message: "Failed to fetch recovery positions", error: error.message });
    }
  });
}

