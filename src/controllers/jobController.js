import {createJob} from '../db/queries/jobs'

export const postJob = async (req,res)=>{
    const user_id = req.body.userId
    const {title,description,required_skills} = req.body
}
