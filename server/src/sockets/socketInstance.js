let io;

export const setIO = (IOInstance)=>{
    io = IOInstance
}

export const getIO = ()=>{
    return io || null;
}