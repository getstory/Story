import { getColor } from '../../config/bot.js';
import { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags 
} from 'discord.js';

import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';

export default {

    data: new SlashCommandBuilder()

        .setName("ticket")
        .setDescription("Manages the server's ticket system.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

        .addSubcommand((subcommand) =>

            subcommand
                .setName("setup")
                .setDescription("Sets up the ticket creation panel in a specified channel.")

                .addChannelOption(option =>
                    option
                        .setName("panel_channel")
                        .setDescription("The channel where the ticket panel will be sent.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("panel_message")
                        .setDescription("The main message/description for the ticket panel.")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("button_label")
                        .setDescription("The label for the ticket creation button.")
                        .setRequired(false)
                )

                .addStringOption(option =>
                    option
                        .setName("panel_type")
                        .setDescription("Choose the ticket panel style.")
                        .addChoices(
                            {
                                name: "🔘 Button Panel",
                                value: "button"
                            },
                            {
                                name: "📋 Dropdown Panel",
                                value: "dropdown"
                            }
                        )
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription("Category where tickets are created.")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("closed_category")
                        .setDescription("Category where closed tickets move.")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )

                .addRoleOption(option =>
                    option
                        .setName("staff_role")
                        .setDescription("Role that can access tickets.")
                        .setRequired(false)
                )

                .addIntegerOption(option =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("Maximum tickets a user can create.")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )

                .addBooleanOption(option =>
                    option
                        .setName("dm_on_close")
                        .setDescription("Send DM when ticket closes.")
                        .setRequired(false)
                )
        )


        .addSubcommand(subcommand =>
            subcommand
                .setName("dashboard")
                .setDescription("Open ticket dashboard")
        ),


    category: "ticket",


    async execute(interaction, config, client) {


        const deferred = await InteractionHelper.safeDefer(
            interaction,
            { flags: MessageFlags.Ephemeral }
        );

        if (!deferred) return;



        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {

            return replyUserError(interaction,{
                type: ErrorTypes.PERMISSION,
                message:"You need Manage Channels permission."
            });

        }



        const subcommand = interaction.options.getSubcommand();



        if(subcommand === "dashboard"){

            return ticketConfig.execute(
                interaction,
                config,
                client
            );

        }



        if(subcommand === "setup"){


            const existingConfig =
                await getGuildConfig(
                    client,
                    interaction.guildId
                );



            if(existingConfig?.ticketPanelChannelId){

                return replyUserError(interaction,{
                    type:ErrorTypes.UNKNOWN,
                    message:
                    `This server already has a ticket system. Use /ticket dashboard.`
                });

            }




            const panelChannel =
                interaction.options.getChannel("panel_channel");


            const categoryChannel =
                interaction.options.getChannel("category");


            const closedCategoryChannel =
                interaction.options.getChannel("closed_category");


            const staffRole =
                interaction.options.getRole("staff_role");



            const panelMessage =
                interaction.options.getString("panel_message")
                ||
                "Click the button below to create a support ticket.";



            const buttonLabel =
                interaction.options.getString("button_label")
                ||
                "Create Ticket";



            const panelType =
                interaction.options.getString("panel_type")
                ||
                "button";



            const maxTicketsPerUser =
                interaction.options.getInteger("max_tickets_per_user")
                ||
                3;



            const dmOnClose =
                interaction.options.getBoolean("dm_on_close")
                !== false;





            const setupEmbed = createEmbed({

                title:"🎫 Support Tickets",

                description:panelMessage,

                color:getColor("info")

            });




            const ticketRow =
                ticketConfig.buildPanelButtonRow({

                    ticketPanelType: panelType,

                    ticketButtonLabel: buttonLabel

                });





            try {


                const sentPanel =
                    await panelChannel.send({

                        embeds:[
                            setupEmbed
                        ],

                        components:[
                            ticketRow
                        ]

                    });





                const currentConfig = existingConfig || {};



                currentConfig.ticketCategoryId =
                    categoryChannel?.id || null;


                currentConfig.ticketClosedCategoryId =
                    closedCategoryChannel?.id || null;


                currentConfig.ticketStaffRoleId =
                    staffRole?.id || null;



                currentConfig.ticketPanelChannelId =
                    panelChannel.id;



                currentConfig.ticketPanelMessageId =
                    sentPanel.id;



                currentConfig.ticketPanelMessage =
                    panelMessage;



                currentConfig.ticketButtonLabel =
                    buttonLabel;



                currentConfig.ticketPanelType =
                    panelType;



                currentConfig.maxTicketsPerUser =
                    maxTicketsPerUser;



                currentConfig.dmOnClose =
                    dmOnClose;




                await setGuildConfig(
                    client,
                    interaction.guildId,
                    currentConfig
                );





                await InteractionHelper.safeEditReply(
                    interaction,
                    {

                        embeds:[

                            successEmbed(
                                "Ticket Panel Setup",
                                `Panel created using **${panelType}** mode.`
                            )

                        ]

                    }
                );



            } catch(error){


                logger.error(
                    "Ticket setup error",
                    error
                );


                await handleInteractionError(
                    interaction,
                    error,
                    {
                        commandName:"ticket_setup"
                    }
                );

            }

        }

    }

};
