import React from "react";
import { Recipient, ROLES } from "@/types/types";
import {Plus} from "lucide-react";


const RecipientsList = React.memo(function RecipientsList({ recipients = [], onAddRecipients }: { recipients: Recipient[], onAddRecipients: () => void }) {
    return (
        <>
         <div className="bg-gray-50 border-b flex items-center justify-between p-4 text-xs">
              <span>Recipients: {recipients.length} </span><button  className={`primary-button p-1 rounded-full`}  onClick={onAddRecipients} title={'Add Recipient'} > <Plus size={16}/> </button>
        </div>        
          <div id="recipient-list-container" className="space-y-2 p-4 flex-1 overflow-y-auto">
            {recipients.length === 0 ? (
              <div className="bg-blue-50 flex items-center p-1 rounded-md text-xs">
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-2">
                  N
                </div>
                <div className="text-gray-800">
                  No Recipient assigned yet.                 
                </div>
              </div>
            ) : (
              recipients.map((recipient) => {
                   const roleDef = ROLES.find(r => r.value === recipient.role);
                   const Icon = roleDef?.icon;
                return(
                <div key={recipient.id} className="flex items-center bg-blue-50 gap-2 rounded-md shadow-sm text-xs p-1 w-full" title={`${recipient.email}, ${recipient.role}`} >
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white" style={{backgroundColor: recipient.color}}>
                    {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'R'}
                  </div>
                  <div className="text-gray-800 flex-1 text-overflow overflow-hidden text-ellipsis">                    
                    <span className="w-[82%] text-gray-500 ">{recipient.email}</span>
                    <span className="flex items-center gap-1"> {Icon && <Icon size={12} />} {recipient.totalFields} fields </span>                      
                  </div>
                   <div className="w-4 h-4 flex items-center justify-center rounded-full text-white" style={{backgroundColor: recipient.color}}>                       
                      {recipient.order}
                  </div>
                </div>
              )})
            )}
          </div>
        </>
    )
});
export default RecipientsList