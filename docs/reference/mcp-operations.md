# MCP Operations Catalog

MCP (profile) operations are the Fortnite game-service commands that read and mutate a player's profiles — cosmetics, purchases, quests, Save the World data and more. Every operation is the same request shape, so the wrapper exposes a single generic caller (`session.mcpOperation`, `client.mcp.operation`) plus typed helpers for the two query operations. See [MCP Client](/epic/mcp) for the API.

## Endpoint

```
POST https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/{route}/{operation}?profileId={profileId}&rvn=-1
```

Requires a bearer token from an account-bound session. The body is operation-specific JSON (default `{}`). `rvn` (revision number) defaults to `-1`.

## Profiles

| `profileId` | Description |
| --- | --- |
| `athena` | Battle Royale data |
| `creative` | Creative data |
| `campaign` | Save the World data |
| `common_public` | Public data (e.g. current user banner) |
| `collections` | Battle Royale collections (Fishing / NPC) |
| `common_core` | Main profile: banners, purchases, ban status, gift history and more |
| `metadata` | Save the World Homebase data |
| `collection_book_people0` | Collection book: heroes, survivors, defenders |
| `collection_book_schematics0` | Collection book: schematics |
| `outpost0` | STW storage |
| `theater0` | STW backpack |
| `theater1` | Events backpack |
| `theater2` | Ventures data |
| `recycle_bin` | STW recycle bin |

## Routes

| `route` | Description |
| --- | --- |
| `client` | The route you normally use. |
| `public` | Only for `QueryPublicProfile`. |
| `dedicated_server` | Server-only; requires the dedicated-server role you cannot hold. |

## Operations

All 149 operations below can be called through `session.mcpOperation(name, options)` or `client.mcp.operation(accessToken, accountId, name, options)`. Use `isMCPOperation(name)` to validate a name, or `MCP_OPERATIONS` for the full list at runtime.

### Sourcing & refresh

`MCP_OPERATIONS` is generated from [LeleDerGrasshalmi/FortniteEndpointsDocumentation](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/Game/Profile/Operations) — the same directory Epic's profile operations are documented in. The committed list (`src/epic/mcp-operations.generated.ts`) is what backs the compile-time `MCPOperation` union type and the default runtime allowlist, so nothing depends on the network at import time.

To regenerate the committed list from GitHub, run `npm run generate:mcp` (backed by `tools/generate-mcp-operations.ts`).

To top up the **runtime** allowlist without a rebuild — picking up operations added upstream since your installed version — call `refreshMCPOperations()`. It fetches the directory (via the global `fetch`, or one you pass), unions any new names into the allowlist used by `isMCPOperation`, and returns the names it added. It never removes known operations. `MCPClient` also exposes this as `mcp.refreshOperations()`, and `knownMCPOperations()` returns the current runtime set.

```ts
import { refreshMCPOperations, knownMCPOperations, isMCPOperation } from 'fnapi-js';

const added = await refreshMCPOperations();
console.log(`added ${added.length} new operations`, knownMCPOperations().length);
isMCPOperation(added[0]); // true
```

| Operation | Operation | Operation |
| --- | --- | --- |
| `AbandonExpedition` | `ExchangeGameCurrencyForSeasonPassOffer` | `SetActiveArchetype` |
| `ActivateConsumable` | `ExchangeGiftToken` | `SetActiveHeroLoadout` |
| `AddToCollection` | `FortRerollDailyQuest` | `SetAffiliateName` |
| `ApplyVote` | `GiftCatalogEntry` | `SetCosmeticLockerBanner` |
| `AssignDefenderToLoadout` | `InitializeTheater` | `SetCosmeticLockerName` |
| `AssignGadgetToLoadout` | `IssueFriendCode` | `SetCosmeticLockerSlot` |
| `AssignHeroToLoadout` | `LockProfileForWrite` | `SetCosmeticLockerSlots` |
| `AssignTeamPerkToLoadout` | `MarkCollectedItemsSeen` | `SetCreativePlotMetadata` |
| `AssignWeaponToDefender` | `MarkItemSeen` | `SetFactionChoice` |
| `AssignWorkerToSquad` | `MarkNewQuestNotificationSent` | `SetForcedIntroPlayed` |
| `AssignWorkerToSquadBatch` | `ModifyCreativePlotPermissions` | `SetGameplayStats` |
| `AthenaPinQuest` | `ModifyMission` | `SetHardcoreModifier` |
| `AthenaRemoveQuests` | `ModifyQuickbar` | `SetHeroCosmeticVariants` |
| `AthenaTrackQuests` | `OpenCardPack` | `SetHomebaseBanner` |
| `BulkUpdateCollections` | `OpenCardPackBatch` | `SetHomebaseName` |
| `CancelOrResumeSubscription` | `PopulatePrerolledOffers` | `SetIntroGamePlayed` |
| `ChallengeBundleLevelUp` | `PromoteItem` | `SetItemArchivedStatusBatch` |
| `ClaimCollectedResources` | `ProtoJuno_CreateWorld` | `SetItemFavoriteStatus` |
| `ClaimCollectionBookPageRewards` | `ProtoJuno_DeleteAllWorlds` | `SetItemFavoriteStatusBatch` |
| `ClaimCollectionBookRewards` | `ProtoJuno_DeleteWorld` | `SetLastUsedBattleLabFile` |
| `ClaimImportFriendsReward` | `ProtoJuno_MarkWorldDeleted` | `SetLastUsedCreativePlot` |
| `ClaimLoginReward` | `ProtoJuno_SetWorldName` | `SetLastUsedProject` |
| `ClaimMfaEnabled` | `ProtoJuno_UpdateWorldLastAccessTime` | `SetLoadoutShuffleEnabled` |
| `ClaimMissionAlertRewards` | `ProtoJuno_UpdateWorldMetadata` | `SetMatchmakingBansViewed` |
| `ClaimQuestReward` | `ProtoJuno_UpdateWorldSysMetadata` | `SetMtxPlatform` |
| `ClaimSubscriptionRewards` | `PurchaseCatalogEntry` | `SetPartyAssistQuest` |
| `ClearHeroLoadout` | `PurchaseMultipleCatalogEntries` | `SetPinnedQuests` |
| `ClientQuestLogin` | `PurchaseOrUpgradeHomebaseNode` | `SetRandomCosmeticLoadoutFlag` |
| `CollectExpedition` | `PurchaseResearchStatUpgrade` | `SetReceiveGiftsEnabled` |
| `CompletePlayerSurvey` | `PutModularCosmeticLoadout` | `SetRewardGraphConfig` |
| `ConvertItem` | `QueryProfile` | `SetSeasonPassAutoClaim` |
| `ConvertLegacyAlterations` | `QueryPublicProfile` | `SkipTutorial` |
| `ConvertSlottedItem` | `RecordCampaignMatchEnded` | `StartExpedition` |
| `CopyCosmeticLoadout` | `RecycleItem` | `StorageTransfer` |
| `CraftWorldItem` | `RecycleItemBatch` | `ToggleQuestActiveState` |
| `CreateNewBattleLabFile` | `RedeemRealMoneyPurchases` | `UnassignAllSquads` |
| `CreateNewIsland` | `RedeemResearchToken` | `UnlockProfileForWrite` |
| `CreateNewIslandFromLinkCode` | `RedeemSTWAccoladeTokens` | `UnlockRewardNode` |
| `DeleteBattleLabIsland` | `RefreshExpeditions` | `UnslotItemFromCollectionBook` |
| `DeleteCosmeticLoadout` | `RefundItem` | `UpdatePlotPublishInfo` |
| `DeleteIsland` | `RefundMtxPurchase` | `UpdateQuestClientObjectives` |
| `DeleteModularCosmeticLoadout` | `RemoveGiftBox` | `UpdateQuests` |
| `DepositPostResources` | `ReportConsumableUsed` | `UpgradeAlteration` |
| `DestroyWorldItems` | `RequestRestedStateIncrease` | `UpgradeItem` |
| `DisassembleWorldItems` | `ResearchItemFromCollectionBook` | `UpgradeItemBulk` |
| `DuplicateIsland` | `RespecAlteration` | `UpgradeItemRarity` |
| `EndBattleRoyaleGame` | `RespecResearch` | `UpgradeSlottedItem` |
| `EndBattleRoyaleGameV2` | `RespecUpgrades` | `VerifyRealMoneyPurchase` |
| `EquipModularCosmeticLoadoutPreset` | `RestoreDeletedIsland` | `ExecuteTerminalCommand` |
| `ExchangeGameCurrencyForBattlePassOffer` | `ServerQuestLogin` |  |
