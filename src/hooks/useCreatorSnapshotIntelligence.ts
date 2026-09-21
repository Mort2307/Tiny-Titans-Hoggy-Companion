import { useEffect,useMemo,useState } from "react";
import { loadCreatorSnapshot } from "../services/creatorSnapshotService";
import { buildCreatorSnapshotView, filterCreatorSnapshotRecords, type CreatorSnapshotView } from "../lib/creatorSnapshotView";
import type { DetailFilter, DrillRecord, TileKey } from "../types/creatorSnapshot";

export function useCreatorSnapshotIntelligence(){
 const [snapshot,setSnapshot]=useState<CreatorSnapshotView["snapshot"]|null>(null);
 const [selected,setSelected]=useState<TileKey|null>(null);
 const [selectedRecord,setSelectedRecord]=useState<DrillRecord|null>(null);
 const [selectedUserId,setSelectedUserId]=useState<string|null>(null);
 const [detailFilter,setDetailFilter]=useState<DetailFilter>("all");
 const [error,setError]=useState("");
 const reload=async()=>{setError("");setSelectedRecord(null);setSelectedUserId(null);try{setSnapshot(await loadCreatorSnapshot());}catch(reason){setError(reason instanceof Error?reason.message:"Creator intelligence could not be loaded.");}};
 useEffect(()=>{void reload();},[]);
 const view=useMemo(()=>snapshot?buildCreatorSnapshotView(snapshot):null,[snapshot]);
 const tileRecords=useMemo(()=>snapshot&&selected?filterCreatorSnapshotRecords(snapshot,selected,detailFilter):[],[snapshot,selected,detailFilter]);
 const openTile=(key:TileKey)=>{setSelected((current)=>current===key?null:key);setSelectedRecord(null);setSelectedUserId(null);setDetailFilter("all");};
 const selectFilter=(filter:DetailFilter)=>{setDetailFilter((current)=>current===filter?"all":filter);setSelectedRecord(null);setSelectedUserId(null);};
 const selectedUser=snapshot&&selectedUserId?snapshot.users[snapshot.userIds.indexOf(selectedUserId)]:undefined;
 const selectedTile=view?.tiles.find((tile)=>tile.key===selected);
 return {snapshot,selected,setSelected,selectedRecord,setSelectedRecord,selectedUserId,setSelectedUserId,detailFilter,setDetailFilter,error,reload,view,tileRecords,openTile,selectFilter,selectedUser,selectedTile};
}
