import React,{createContext,useContext,useEffect,useState} from 'react';
import {api} from '../api/api';
import {useCart} from './CartContext';
const Context=createContext(null);
export function FranchiseSelectionProvider({children}) {
  const {clearCart}=useCart();
  const [franchises,setFranchises]=useState([]);
  const [selectedId,setSelectedId]=useState(()=>localStorage.getItem('officebite_branch')||'');
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const reload=async()=>{
    try{
      const {franchises:list=[]}=await api.getActiveFranchises();
      setFranchises(list);setError('');
      const saved=localStorage.getItem('officebite_branch')||'';
      const next=list.some(f=>f._id===saved)?saved:(list[0]?._id||'');
      if(saved&&next!==saved)clearCart();
      setSelectedId(next);
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };
  useEffect(()=>{reload();},[]);
  useEffect(()=>{if(selectedId)localStorage.setItem('officebite_branch',selectedId);else localStorage.removeItem('officebite_branch');},[selectedId]);
  const selectFranchise=id=>{if(id!==selectedId){clearCart();setSelectedId(id);}};
  return <Context.Provider value={{franchises,selectedId,selectFranchise,reload,loading,error}}>{children}</Context.Provider>;
}
export const useFranchiseSelection=()=>useContext(Context);
