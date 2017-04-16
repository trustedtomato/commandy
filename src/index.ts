/*
Program: Can have commands or be used with argvuments
Command: Holds namespace for other Program
Argvument: Option & argument
Option: --option, -o
Argument: Argvument which is not option; this defines the main usage of the command
*/

const deepEqual = (obj1:{[key: string]:any},obj2:{[key: string]:any}):boolean => {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export enum ArgumentTypes{
	required,
	optional
}
export interface Argument{
	type:ArgumentTypes
	name:string
}

export const requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
export const optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
export const parseArgSyntax = (argSyntax:string):Argument[] => {
	const args = argSyntax.split(/\s+/g).filter(arg => arg!=='');
	return args.map(arg => {
		const requiredArgMatch = arg.match(requiredArgRegex);
		const optionalArgMatch = arg.match(optionalArgRegex);
		if(requiredArgMatch) return{ type: ArgumentTypes.required, name: requiredArgMatch[1] };
		if(optionalArgMatch) return{ type: ArgumentTypes.optional, name: optionalArgMatch[1] };
		throw new Error('Invalid argument: '+arg);
	});
};

/** The first bracket is the command, the second one is the argument syntax (which is optional) */
export const commandRegex = /^([a-z0-9-_]+)(?:\s+(.*))?$/i;



export enum OptionAppearanceTypes{
	long,
	short
}
export interface OptionAppearance{
	text:string
	type:OptionAppearanceTypes
}
export interface BasicOption{
	appearances:OptionAppearance[],
	argument:Argument|null
}
export const optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
export const parseOption = ((option:string) => {
	const optionMatch = option.match(optionRegex);
	if(!optionMatch){
		throw new Error('Invalid option: '+option);
	}
	if(typeof optionMatch[1] === 'string'){
		return{
			type: OptionAppearanceTypes.short,
			text: optionMatch[1]
		};
	}else{
		return{
			type: OptionAppearanceTypes.long,
			text: optionMatch[2]
		};
	}
});
export const parseOptionSyntax = (optionSyntax:string):BasicOption => {
	const options = optionSyntax.trim().split(/[,\s]+/g);
	try{
		const argument = parseArgSyntax(options[options.length-1])[0];
		const appearances:OptionAppearance[] = options.slice(0,-1).map(option => parseOption(option));
		return{argument,appearances};
	}catch(err){
		const appearances:OptionAppearance[] = options.map(option => parseOption(option));
		return{appearances,argument: null};
	}
};



export class Option{
	appearances:OptionAppearance[]
	argument:Argument|null
	description?:string
	canBeLonely:boolean = false
	constructor(fullSyntax:string,descriptionOrCanBeLonely?:string|boolean,canBeLonely?:boolean){
		Object.assign(this,parseOptionSyntax(fullSyntax));
		if(typeof descriptionOrCanBeLonely === 'string'){
			this.description = descriptionOrCanBeLonely;
		}else{
			if(typeof canBeLonely !== 'undefined'){
				throw new Error('Cannot define two options!');
			}
			canBeLonely = descriptionOrCanBeLonely;
		}
		if(typeof canBeLonely === 'boolean'){
			this.canBeLonely = canBeLonely;
		}
	}
}

export interface Result{
	commandChain:string
	options:{
		[option: string]:string|boolean
	}
	arguments:{
		[property: string]:string
	}
}

export class Program{
	_arguments:Argument[]
	_description:string = ''
	_commands:Map<string,Program> = new Map()
	_options:Option[] = []
	description(description:string){
		this._description = description;
		return this;
	}
	arguments(syntax:string){
		const _arguments = parseArgSyntax(syntax);
		this._arguments = _arguments;
	}
	option(appearances:string,descriptionOrCanBeLonely?:string,canBeLonely?:boolean){
		this._options.push(new Option(appearances,descriptionOrCanBeLonely,canBeLonely));
		return this;
	}
	command(fullSyntax:string):Program{
		const commandMatch = fullSyntax.trim().match(commandRegex);
		if(!commandMatch){
			throw new Error('Invalid command syntax!');
		}
		const commandName = commandMatch[1];
		const command = new Program(commandMatch[2] || '');
		this._commands.set(commandName,command);
		return command;
	}
	parse(argvs:string[]):Result{
		const firstArgumentIndex = argvs.findIndex(argv => !argv.startsWith('-'));
		if(firstArgumentIndex>=0){
			const firstArgument = argvs[firstArgumentIndex];
			const matchingCommand = this._commands.get(firstArgument);
			if(matchingCommand){
				argvs.splice(firstArgumentIndex,1);
				const parsed = matchingCommand.parse(argvs);
				return Object.assign(parsed,{commandChain: (firstArgument+' '+parsed.commandChain).trim()});
			}
		}

		const options:{[option: string]:string|boolean} = {};
		const args:string[] = [];
		let canBeLonely = false;
		for(let i = 0; i < argvs.length; i++){
			if(argvs[i].startsWith('-')){
				let option = argvs[i];
				let answer:string|boolean;
				if(option.includes('=')){
					const splittedOption = option.split('=');
					option = splittedOption[0];
					answer = splittedOption.slice(1).join('=');
				}
				if(!option.startsWith('--') && option.length>2){
					option.replace('-','').split('').map(option => '-'+option).forEach(option => {
						const parsedOption = parseOption(option);
						const _option = this._options.find(_option => 
							_option.appearances.some(appearance =>
								deepEqual(parsedOption,appearance)
							)
						);
						if(typeof _option === 'undefined'){
							throw new Error('-'+option+' is not a valid option!');
						}
						if(_option.canBeLonely){
							canBeLonely = true;
						}
						if(_option.argument!==null && _option.argument.type===ArgumentTypes.required){
							throw new Error('-'+option+' should have a value!');
						}
						_option.appearances
							.filter(appearance => appearance.type===OptionAppearanceTypes.long)
							.forEach(appearance => {
								options[appearance.text] = true;
							});
					});
				}else{
					const parsedOption = parseOption(option);
					const _option = this._options.find(_option => 
						_option.appearances.some(appearance =>
							deepEqual(parsedOption,appearance)
						)
					);
					if(typeof _option === 'undefined'){
						throw new Error(option + ' is not a valid option!');
					}
					if(_option.canBeLonely){
						canBeLonely = true;
					}
					if(_option.argument===null){
						answer = true;
					}else if(typeof answer === 'undefined'){
						if(_option.argument.type===ArgumentTypes.required){
							if(typeof argvs[i+1] === 'undefined'){
								throw new Error(option + ' should have a value!');
							}
							answer = argvs[i+1];
							i++;
						}
					}
					_option.appearances
						.filter(appearance => appearance.type===OptionAppearanceTypes.long)
						.forEach(appearance => {
							options[appearance.text] = answer;
						});
				}
			}else{
				args.push(argvs[i]);
			}
		}
		let numberOfRequiredArgs = this._arguments.reduce((n,_arg) => {
			if(_arg.type===ArgumentTypes.required){
				n++;
			}
			return n;
		},0);
		if(!canBeLonely && numberOfRequiredArgs > args.length){
			throw new Error('Missing arguments! The amount of them: '+(numberOfRequiredArgs-args.length));
		}
		let numberOfFillableOptionalArgs = args.length - numberOfRequiredArgs;
		const argumentObject:any = {};
		let argI = 0;
		argLoop: for(let arg of this._arguments){
			if(typeof args[argI] === 'undefined') break argLoop;
			if(arg.type===ArgumentTypes.optional){
				if(numberOfFillableOptionalArgs<=0){
					continue;
				}else{
					numberOfFillableOptionalArgs--;
				}
			}
			argumentObject[arg.name] = args[argI];
			argI++;
		}
		return{
			commandChain: '',
			arguments: argumentObject,
			options: options
		};
	}
	constructor(syntax:string = ''){
		this.arguments(syntax);
	}
}
export const program = new Program();