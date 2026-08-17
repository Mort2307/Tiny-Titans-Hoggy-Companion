import { createContext } from "react";
import type { User } from "firebase/auth";
import type { AgeBand, ApproximateLocation, DataCollectionPreferences, EducatorProfile, LearningLevel, ProfileType } from "../types/Profile";
import type { UnitSystem } from "./UnitContext";
<<<<<<< HEAD
export type UserRole = "user" | "admin" | "moderator"; export type UserCategory = "adult" | "child"; export type ExperienceLevel = "beginner" | "intermediate" | "pro"; export type UserInterest = "keeper" | "breeder" | "breeder-seller" | "learner"; export type UserPlatform = "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other"; export type UserProfile = { uid:string; displayName:string; email:string; category:UserCategory; ageBand?:AgeBand; learningLevel?:LearningLevel; profileType:ProfileType; experienceLevel:ExperienceLevel; interests:UserInterest[]; role:UserRole; isTester:boolean; setupComplete:boolean; unitSystem:UnitSystem; educatorProfile?:EducatorProfile; approximateLocation?:ApproximateLocation; dataCollectionPreferences?:DataCollectionPreferences; platform?:UserPlatform; appVersion?:string; createdAt?:unknown; updatedAt?:unknown }; export type AuthContextType = { user:User|null; profile:UserProfile|null; loading:boolean; profileLoading:boolean; isAuthenticated:boolean; refreshProfile:()=>Promise<UserProfile|null> }; export const AuthContext = createContext<AuthContextType | undefined>(undefined);
=======

export type UserRole = "user" | "admin" | "moderator";
export type UserCategory = "adult" | "child";
export type ExperienceLevel = "beginner" | "intermediate" | "pro";
export type UserInterest = "keeper" | "breeder" | "breeder-seller" | "learner";
export type UserPlatform = "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other";
export type UserProfile = { uid:string; displayName:string; email:string; category:UserCategory; ageBand?:AgeBand; learningLevel?:LearningLevel; profileType:ProfileType; experienceLevel:ExperienceLevel; interests:UserInterest[]; role:UserRole; isTester:boolean; setupComplete:boolean; unitSystem:UnitSystem; educatorProfile?:EducatorProfile; approximateLocation?:ApproximateLocation; dataCollectionPreferences?:DataCollectionPreferences; platform?:UserPlatform; appVersion?:string; createdAt?:unknown; updatedAt?:unknown };
export type AuthContextType = { user:User|null; profile:UserProfile|null; loading:boolean; profileLoading:boolean; isAuthenticated:boolean; refreshProfile:()=>Promise<UserProfile|null> };
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
>>>>>>> origin/master
