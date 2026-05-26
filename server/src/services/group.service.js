import mongoose from "mongoose"
import { getGroupMembers } from "../sockets/utils/getGroupMembers.js"
import { ApiError } from "../utils/apiUtils.js"
import { isChatExists } from "../utils/document existance check/chat.js"
import { isUserExists } from "../utils/document existance check/user.js"
import { Message } from "../models/message.model.js"
import {isMemberAlreadyInGroup} from "../utils/document existance check/group.js"

/**
 * @description Adds a new participant to an existing group chat.
 * @access  Private (Admin Only)
 * @param   {string}  groupId   - The ID of the target group chat
 * @param   {object}  user      - The admin user performing the action
 * @param   {string}  memberId  - The ID of the user to be added
 * @returns {object}  result
 */
const addMembertoGroupService = async (groupId,user,memberId)=>{   // Admin Protected 

    const groupChat = await isChatExists(groupId)
    const newMember = await isUserExists(memberId)
       
    if(!groupChat || !newMember){
        throw new ApiError(400,"Invalid GroupId or MemberId.")
    }
      
    const isAlreadyInGroup = groupChat.participants.some(p => p.toString() === memberId.toString())
    
    if(isAlreadyInGroup){
        throw new ApiError(400,"Member Already In Group.")
    }
    
    const newIndicator = await Message.create({
        chatId:groupId,
        sender:user._id,
        message:`${user.username} added ${newMember.username}`,
        isIndicator:true
    })

        groupChat.participants.push(new mongoose.Types.ObjectId(memberId))

        await groupChat.save()

        const groupMenbers = await getGroupMembers(groupId)


        if(!groupMenbers || !groupMenbers.length){
           throw new ApiError(500,"Error While Adding Member In Group.")
        }

        return {
            newIndicator, 
            groupMenbers,
            newMember
        }
}


/**
 * @description mark member as admin of group.
 * @return updated {group,indicator,groupMenbers}.
 * @access Private (Admin Only)
 * @param {ObjectId} groupId 
 * @param {ObjectId} memberId 
 */
const markMemberAsAdminService = async (groupId,memberId)=>{       // Admin Protected

    const group = await isChatExists(groupId)
    const member = await isUserExists(memberId)

    const isAlreadyInGroup = isMemberAlreadyInGroup(group,memberId)

    if(isAlreadyInGroup){
        throw new ApiError(400,"User already admin")
    }

    group.admins.push(member._id)

    await group.save()

    const newIndicator = await Message.create({
        chatId:groupId,
        isIndicator:true,
        message: `${member.username} is now an admin.`
    })

    const groupMenbers = await getGroupMembers(groupId)

    return {
        group,
        newIndicator,
        groupMenbers:groupMenbers?.length > 0 ? groupMenbers : []
    };

}

/**
 * @description un-mark member as admin of group.
 * @return updated {group,indicator,groupMenbers}.
 * @access Private (Admin Only)
 * @param {ObjectId} groupId 
 * @param {ObjectId} memberId 
 */
const unmarkMemberAsAdminService = async (groupId,memberId)=>{       // Admin Protected

    const group = await isChatExists(groupId)
    const member = await isUserExists(memberId)

    group.admins = group.admins.filter(member => member.toString() !== memberId.toString())

    await group.save()

    const newIndicator = await Message.create({
        chatId:groupId,
        isIndicator:true,
        message: `${member.username} is no longer an admin.`
    })

    const groupMenbers = await getGroupMembers(groupId)

    return {
        group,
        newIndicator,
        groupMenbers:groupMenbers?.length > 0 ? groupMenbers : []
    };

}


export {
    addMembertoGroupService,
    markMemberAsAdminService,
    unmarkMemberAsAdminService
}