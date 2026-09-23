import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { MorphDefinition } from "../data/morphs";
import { normaliseSearch, rankMorphSearch } from "../utils/searchRelevance";
import { reverseMorph, type MorphReversalResult } from "../utils/geneticsReversal";

export function useMorphReversal(morphs: MorphDefinition[]) {
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedMorph=searchParams.get("morph")?.trim()??"";
  const [query,setQuery]=useState(requestedMorph);
  const [pickerQuery,setPickerQuery]=useState("");
  const [result,setResult]=useState<MorphReversalResult|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [pickerOpen,setPickerOpen]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const lastUrlMorphRef=useRef<string|null>(null);
  const options=useMemo(()=>[...morphs].filter((morph)=>morph.verification!=="Unverified"&&morph.verification!=="Disputed"&&(morph.kind==="Gene"||morph.kind==="Super"||morph.kind==="Combination")).sort((a,b)=>a.name.localeCompare(b.name)),[morphs]);
  const pickerResults=useMemo(()=>{const needle=normaliseSearch(pickerQuery);return needle?rankMorphSearch(options,pickerQuery,"strict"):options;},[options,pickerQuery]);
  useEffect(()=>{
    if(lastUrlMorphRef.current===requestedMorph)return;
    lastUrlMorphRef.current=requestedMorph;
    if(!requestedMorph){setQuery("");setResult(null);setError(null);return;}
    const resolved=reverseMorph(requestedMorph);
    if(resolved){setQuery(resolved.canonicalName);setResult(resolved);setError(null);}
  },[requestedMorph]);
  function clearStateForEdit(nextValue:string){setQuery(nextValue);setResult(null);setError(null);if(requestedMorph)setSearchParams((current)=>{current.delete("morph");return current;},{replace:true});}
  function resolve(value=query){
    const clean=value.trim();
    if(!clean){setError("Enter a morph or recognised combination.");setResult(null);return;}
    const resolved=reverseMorph(clean);
    if(!resolved){setError("That morph could not be resolved from the current recognised genetics library.");setResult(null);return;}
    setQuery(resolved.canonicalName);setPickerQuery("");setPickerOpen(false);setSearchParams((current)=>{current.set("mode","reversal");current.set("morph",resolved.canonicalName);return current;},{replace:true});setError(null);setResult(resolved);
  }
  function handlePickerSelect(name:string){setQuery(name);resolve(name);}
  function reverseComponent(name:string){setQuery(name);resolve(name);}
  function clearFreeType(){clearStateForEdit("");inputRef.current?.focus();}
  return {requestedMorph,query,setQuery,pickerQuery,setPickerQuery,result,error,setError,pickerOpen,setPickerOpen,inputRef,options,pickerResults,clearStateForEdit,resolve,handlePickerSelect,reverseComponent,clearFreeType};
}