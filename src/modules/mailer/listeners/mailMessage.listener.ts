import { enduranceListener, enduranceEventTypes } from '@programisto/endurance';
import { sendMailFromTemplate, SendMailOptions } from '../services/mailer.service.js';

enduranceListener.createListener(enduranceEventTypes.SEND_EMAIL, async (args: unknown) => {
    try {
        if (!args || typeof args !== 'object') {
            console.error('Invalid arguments provided to SEND_EMAIL listener', { args });
            return;
        }
        const result = await sendMailFromTemplate(args as SendMailOptions);
        if (!result.success) {
            console.error('Failed to send email from listener', {
                error: result.error,
                args
            });
        }
    } catch (listenerError) {
        console.error('Error in SEND_EMAIL listener', {
            error: listenerError instanceof Error ? listenerError.message : listenerError,
            args
        });
    }
});

export default enduranceListener;
