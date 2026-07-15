import { getColor } from '../../config/bot.js';
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags
} from 'discord.js';

import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';


export default {

    data: new SlashCommandBuilder()

        .setName("ticket")
        .setDescription("Manages the server's ticket system.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Sets up the ticket creation panel.")

                .addChannelOption(option =>
                    option
                        .setName("panel_channel")
                        .setDescription("The channel where the panel will be sent.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("panel_message")
                        .setDescription("The ticket panel message.")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("button_label")
                        .setDescription("The ticket button label.")
                        .setRequired(false)
                )

                .addStringOption(option =>
                    option
                        .setName("panel_type")
                        .setDescription("Choose the ticket panel type.")
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
                        .setDescription("Ticket category.")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )

                .addChannelOption(option =>
                    option
                        .setName("closed_category")
                        .setDescription("Closed ticket category.")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )

                .addRoleOption(option =>
                    option
                        .setName("staff_role")
                        .setDescription("Ticket staff role.")
                        .setRequired(false)
                )

                .addIntegerOption(option =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("Maximum tickets per user.")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )

                .addBooleanOption(option =>
                    option
                        .setName("dm_on_close")
                        .setDescription("DM user when ticket closes.")
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("dashboard")
                .setDescription("Open ticket dashboard.")
        ),


    category: "ticket",


    async execute(interaction, config, client) {


        await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });


        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {

            return replyUserError(interaction,{
                type: ErrorTypes.PERMISSION,
                message:"You need Manage Channels permission."
            });

        }


        const subcommand = interaction.options.getSubcommand();


        if(subcommand === "dashboard") {

            return ticketConfig.execute(
                interaction,
                config,
                client
            );

        }



        if(subcommand === "setup") {


            const existingConfig =
                await getGuildConfig(
                    client,
                    interaction.guildId
                );



            const panelChannel =
                interaction.options.getChannel("panel_channel");


            const categoryChannel =
                interaction.options.getChannel("category");


            const closedCategoryChannel =
                interaction.options.getChannel("closed_category");


            const staffRole =
                interaction.options.getRole("staff_role");



            const panelMessage =
                interaction.options.getString("panel_message");



            const buttonLabel =
                interaction.options.getString("button_label")
                || "Create Ticket";



            const panelType =
                interaction.options.getString("panel_type")
                || "button";



            const maxTicketsPerUser =
                interaction.options.getInteger("max_tickets_per_user")
                || 3;



            const dmOnClose =
                interaction.options.getBoolean("dm_on_close")
                ?? true;




            const embed = createEmbed({

                title:"🎫 Support Tickets",

                description:panelMessage,

                color:getColor("info")

            });



            let row;



            if(panelType === "dropdown") {


                const menu =
                    new StringSelectMenuBuilder()

                    .setCustomId("create_ticket")

                    .setPlaceholder("Select ticket category")

                    .addOptions(
                        {
                            label:"General Support",
                            description:"General questions",
                            value:"general",
                            emoji:"💬"
                        },
                        {
                            label:"Bug Report",
                            description:"Report bugs",
                            value:"bug",
                            emoji:"🐛"
                        },
                        {
                            label:"Purchase Help",
                            description:"Payments",
                            value:"purchase",
                            emoji:"💳"
                        }
                    );


                row =
                    new ActionRowBuilder()
                    .addComponents(menu);



            } else {


                row =
                    new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                        .setCustomId("create_ticket")

                        .setLabel(buttonLabel)

                        .setStyle(ButtonStyle.Primary)

                        .setEmoji("📩")

                    );


            }




            try {


                const sentPanel =
                    await panelChannel.send({

                        embeds:[
                            embed
                        ],

                        components:[
                            row
                        ]

                    });



                const currentConfig =
                    existingConfig || {};



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
                                "Ticket Setup Complete",
                                `Created **${panelType}** ticket panel.`
                            )
                        ]
                    }
                );



            } catch(error) {


                logger.error(
                    "Ticket setup failed",
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
