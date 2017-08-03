const includes = <T>(x:T) => (arr:T[]) => arr.includes(x);
const isIn = <T>(arr:T[]) => (x:T) => arr.includes(x);
const flatten = <T>(arr:(T[]|T)[]):T[] => [].concat(...arr);


export type Aliases = string[][];
export type Commands = {[commandName:string]:Program};
export type Options = string[];

export interface OptionValues{
	[option:string]:(string|boolean)[]
}
const optionValuesProxy = {
	get(target:OptionValues, name:string):(string|boolean)[]{
		if(!(name in target)){
			target[name] = [];
		}
		return target[name];
	}
};

export interface ParsedArgvs{
	args:string[],
	options:OptionValues,
	program:Program
}


export class Program{
	aliases:Aliases
	commands:Commands
	optionsWithRequiredArg:Options
	parse(argvs:string[]):ParsedArgvs{

		if(typeof this.commands[argvs[0]] !== 'undefined'){
			return this.commands[argvs[0]].parse(argvs.slice(1));
		}
		const allOptionsWithRequiredArgs = flatten(this.optionsWithRequiredArg.map(
			option => this.aliases.find(includes(option)) || option
		));

		const args:string[] = [];
		const options:OptionValues = new Proxy({}, optionValuesProxy);

		while(argvs.length){
			const argv = argvs.shift();
			const optionMatch = argv.match(/^(--?)(.+?)(?:=(.*))?$/);
			if(!optionMatch){
				args.push(argv);
				continue;
			}

			const dashes = optionMatch[1].length;

			const option = optionMatch[2];
			const opts = dashes===1 ? option.split('') : [option];
			const optsAliases = flatten(opts.map(
				opt => this.aliases.find(includes(opt)) || opt
			));

			const optValue = optionMatch[3] ||
				(allOptionsWithRequiredArgs.some(isIn(optsAliases))
				? argvs.shift()
				: true);
				
			for(const optAlias of optsAliases){
				options[optAlias].push(optValue);
			}
		}

		return{ args, options, program: this };
	}

	constructor(aliases?:Aliases, optionsWithRequiredArg?:Options, commands?:Commands);
	constructor(aliases?:Aliases, commands?:Commands, optionsWithRequiredArg?:Options);
	constructor(optionsWithRequiredArg?:Options, aliases?:Aliases, commands?:Commands);
	constructor(optionsWithRequiredArg?:Options, commands?:Commands, aliases?:Aliases);
	constructor(commands?:Commands, aliases?:Aliases, optionsWithRequiredArg?:Options);
	constructor(commands?:Commands, optionsWithRequiredArg?:Options, aliases?:Aliases);
	constructor(x:any,y:any,z:any){
		this.aliases =
			Array.isArray(x) && Array.isArray(x[0]) ? x :
			Array.isArray(y) && Array.isArray(y[0]) ? y :
			Array.isArray(z) && Array.isArray(z[0]) ? z :
			[];

		this.commands =
			typeof x === 'object' && !Array.isArray(x) ? x :
			typeof y === 'object' && !Array.isArray(y) ? y :
			typeof z === 'object' && !Array.isArray(z) ? z :
			{};

		this.optionsWithRequiredArg = 
			Array.isArray(x) && typeof x[0] === 'string' ? x :
			Array.isArray(y) && typeof y[0] === 'string' ? y :
			Array.isArray(z) && typeof z[0] === 'string' ? z :
			[];
	}
}