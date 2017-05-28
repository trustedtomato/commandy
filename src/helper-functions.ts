export const last = <T>(arr:T[]):T => arr[arr.length-1];
export const partition = <T>(arr:T[],predicate:(x:T)=>boolean) => {
	const partitioned:[T[],T[]] = [[],[]];
	for(const x of arr){
		( predicate(x)
		? partitioned[0]
		: partitioned[1]
		).push(x);
	}
	return partitioned;
};
export const flatten = <T>(arr:T[][]):T[] => [].concat(...arr);
export const split = (str:string,delimeter:string,parts?:number) => {
	const splitted = str.split(delimeter);
	if(typeof parts !== 'number' || parts < 1 || splitted.length<=parts)
		return splitted;
	
	parts = Math.floor(parts);
	return splitted
		.slice(0,parts-1)
		.concat([splitted.slice(parts-1).join(delimeter)]);
};
export const splitBySpace = (str:string) => str.split(/\s+/).filter(part => part!=='');
export const getDeepProperty = (obj:{[key: string]:any},deepProperty:string):any => {
	if(!deepProperty || !obj){
		return obj;
	}
	const [property,leftDeepProperty] = split(deepProperty,' ',2);
	return getDeepProperty(obj[property],leftDeepProperty);
}
export const twist = <T>(arr:T[],deepProperty:string):Map<any,T> => new Map(
	arr.map((member):[any,T] =>
		[getDeepProperty(member,deepProperty),member]
	)
);
export const flattenMapKeys = <T,K>(map:Map<T[],K>):Map<T,K> => {
	const newMap = new Map();
	for(const [keyArr,value] of map){
		for(const key of keyArr){
			if(!newMap.has(key)){
				newMap.set(key,value);
			}
		}
	}
	return newMap;
};
export const withoutPrefix = (arr:string[],prefix:string):string[] =>
	arr
		.filter(x => x.startsWith(prefix))
		.map(x => x.replace(prefix,''));
export const zip = <T,K>(arr1:T[],arr2:K[]):[T,K][] => {
	const length = Math.max(arr1.length,arr2.length);
	return Array(length).map((_,index):[T,K] =>
		[arr1[index],arr2[index]]
	);
};
export const squeezePairs = <T,K>(arr:[T,K][]) => {
	const map:Map<T,K[]> = new Map();
	arr.forEach(([key,value]) => {
		if(!map.has(key)){
			map.set(key,[value]);
		}else{
			map.get(key).push(value);
		}
	});
	return map;
};
export const mapToObj = <T>(map:Map<string,T>) => {
	const obj:{[key:string]:T} = {};
	map.forEach((value,key) => {
		obj[key] = value;
	});
	return obj;
};